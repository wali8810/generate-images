<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Simple .env parser for local development
if (file_exists(__DIR__ . '/../.env')) {
    $lines = file(__DIR__ . '/../.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($name, $value) = explode('=', $line, 2);
        $_ENV[trim($name)] = trim($value);
        putenv(trim($name) . '=' . trim($value));
    }
}

$apiKey = getenv('GEMINI_API_KEY');

if (!$apiKey) {
    http_response_code(500);
    echo json_encode(['error' => 'GEMINI_API_KEY not found']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$userText = $input['userText'] ?? '';
$preset = $input['preset'] ?? null;
$referenceImageBase64 = $input['referenceImageBase64'] ?? null;
$isMockupGeneration = $input['isMockupGeneration'] ?? false;

$finalPrompt = "";

if ($isMockupGeneration && $referenceImageBase64) {
    $variationSeed = rand(0, 10000);
    $vibes = ['Soft Lighting', 'Bright Day', 'Cozy Indoor', 'Minimalist Studio', 'Natural Light', 'Warm Atmosphere', 'Cool Tones'];
    $randomVibe = $vibes[array_rand($vibes)];

    $finalPrompt = "You are an expert product photographer and mockup generator.
YOUR TASK: Take the attached artwork/design and realistically apply it to the product described below.

Product Description: \"$userText\"
Context/Vibe: $randomVibe (Variation ID: $variationSeed)

CRITICAL RULES:
1. The attached image MUST be the design printed/stamped on the product.
2. Do NOT change the design itself, just apply it to the 3D surface of the product.
3. Ensure realistic lighting, shadows, and fabric/material texture.
4. The output must be a high-quality photo of the product with the design.
5. Do not add random text or watermarks.";
} else if ($referenceImageBase64) {
    $promptSuffix = $preset ? "Target Style: " . $preset['promptSuffix'] : '';
    $finalPrompt = "You are an expert image editor and digital artist.
YOUR TASK: Modify the attached reference image based strictly on the user's instruction.

User Instruction: \"$userText\"
$promptSuffix

CRITICAL RULES:
1. USE THE ATTACHED IMAGE AS THE FOUNDATION. Do not generate a completely new random image.
2. Apply the requested changes (e.g., add elements, change background, change style) to the existing subject/composition.
3. Maintain high quality, clear outlines, and vivid colors.
4. If asked to remove background, ensure pure white (#FFFFFF) background.
5. Output as a high-quality 2D digital art/sticker.";
} else {
    $promptSuffix = $preset ? "Style Details: " . $preset['promptSuffix'] : '';
    $finalPrompt = "Generate a high-quality 2D digital art sticker or clipart.
Subject: $userText.
$promptSuffix
Requirements:
- White background (pure white #FFFFFF).
- Clear defined outlines.
- No text inside the image.
- High contrast, vivid colors.
- Vector art style suitable for t-shirt printing.";
}

// Prepare Gemini API Request
$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=$apiKey";

$contents = [];
$parts = [];

if ($referenceImageBase64) {
    $base64Data = preg_replace('#^data:image/\w+;base64,#i', '', $referenceImageBase64);
    $parts[] = ['inlineData' => ['mimeType' => 'image/png', 'data' => $base64Data]];
}

$parts[] = ['text' => $finalPrompt];
$contents[] = ['role' => 'user', 'parts' => $parts];

$payload = [
    'contents' => $contents,
    'generationConfig' => [
        'responseMimeType' => 'application/json' // Request JSON to parse easier, though image comes in inlineData
    ]
];

// Add Image Generation Config
// Note: For gemini-3-pro-image-preview, we don't strictly need 'generationConfig' for the image itself in the same way as Imagen,
// but we pass parameters if supported. The key is the model name.
// However, strictly speaking, the API expects standard generateContent structure.
// Let's try standard structure first.

// We need to use curl
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200) {
    // Fallback logic would go here, but for PHP simple script let's try to handle error
    // If image generation fails, we might want to fallback to SVG (text generation)
    // But let's first check if we got an image.
}

$responseData = json_decode($response, true);
$imageBase64 = null;
$mimeType = 'image/png';

if (isset($responseData['candidates'][0]['content']['parts'])) {
    foreach ($responseData['candidates'][0]['content']['parts'] as $part) {
        if (isset($part['inlineData'])) {
            $imageBase64 = $part['inlineData']['data'];
            if (isset($part['inlineData']['mimeType'])) {
                $mimeType = $part['inlineData']['mimeType'];
            }
            break;
        }
    }
}

if ($imageBase64) {
    echo json_encode(['text' => "data:$mimeType;base64,$imageBase64"]);
    exit;
}

// --- FALLBACK: SVG GENERATION ---
// If we reached here, no image was generated. Let's try generating SVG text.

$svgPrompt = $finalPrompt . "\n\nIMPORTANT: Output ONLY the raw SVG code for the design. Do not wrap in markdown code blocks. Start with <svg and end with </svg>.";
$parts = [];
if ($referenceImageBase64) {
     $base64Data = preg_replace('#^data:image/\w+;base64,#i', '', $referenceImageBase64);
     $parts[] = ['inlineData' => ['mimeType' => 'image/png', 'data' => $base64Data]];
}
$parts[] = ['text' => $svgPrompt];

$payloadSVG = [
    'contents' => [['role' => 'user', 'parts' => $parts]]
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payloadSVG));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

$responseSVG = curl_exec($ch);
curl_close($ch);

$responseDataSVG = json_decode($responseSVG, true);
$text = '';

if (isset($responseDataSVG['candidates'][0]['content']['parts'][0]['text'])) {
    $text = $responseDataSVG['candidates'][0]['content']['parts'][0]['text'];
}

// Clean up markdown
$text = preg_replace('/```xml/i', '', $text);
$text = preg_replace('/```svg/i', '', $text);
$text = preg_replace('/```/i', '', $text);

if (strpos($text, '<svg') !== false) {
    $base64Svg = base64_encode($text);
    $text = "data:image/svg+xml;base64,$base64Svg";
}

echo json_encode(['text' => $text]);
?>
