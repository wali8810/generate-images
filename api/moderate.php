<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Simple .env parser
if (file_exists(__DIR__ . '/../.env')) {
    $lines = file(__DIR__ . '/../.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0)
            continue;
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
$base64Image = $input['base64Image'] ?? null;

if (!$base64Image) {
    echo json_encode(['allowed' => true]);
    exit;
}

$cleanBase64 = preg_replace('#^data:image/\w+;base64,#i', '', $base64Image);

$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=$apiKey";

$payload = [
    'contents' => [
        [
            'role' => 'user',
            'parts' => [
                ['inlineData' => ['mimeType' => 'image/png', 'data' => $cleanBase64]],
                ['text' => "Review this image. Is it a safe, appropriate illustration, vector art, or sticker design? It should not be a raw real-world photo of people, and must not contain NSFW, violence, or hate symbols. Return only 'ALLOWED' if safe or 'REJECTED' if not."]
            ]
        ]
    ]
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

$response = curl_exec($ch);
curl_close($ch);

$responseData = json_decode($response, true);
$text = '';

if (isset($responseData['candidates'][0]['content']['parts'][0]['text'])) {
    $text = strtoupper(trim($responseData['candidates'][0]['content']['parts'][0]['text']));
}

echo json_encode(['allowed' => strpos($text, 'ALLOWED') !== false]);
?>