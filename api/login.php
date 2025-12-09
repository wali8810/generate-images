<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'db.php';

$input = json_decode(file_get_contents('php://input'), true);
$email = $input['email'] ?? '';
$password = $input['password'] ?? '';

$db = getDb();

try {
    $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid credentials']);
        exit;
    }

    // Check Daily Reset
    if ($user['plan_type'] === 'daily') {
        $today = date('Y-m-d');
        if ($user['last_daily_reset'] !== $today) {
            $updateStmt = $db->prepare("UPDATE users SET credits = 10, last_daily_reset = ? WHERE id = ?");
            $updateStmt->execute([$today, $user['id']]);
            $user['credits'] = 10;
            $user['last_daily_reset'] = $today;
        }
    }

    // Generate Token
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload = json_encode(['id' => $user['id'], 'email' => $user['email'], 'role' => $user['role'], 'exp' => time() + (60 * 60 * 24)]);

    $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));

    $secret = getenv('JWT_SECRET') ?: 'supersecretkey';
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $secret, true);
    $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

    $jwt = $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;

    echo json_encode([
        'token' => $jwt,
        'user' => [
            'id' => $user['id'],
            'email' => $user['email'],
            'credits' => $user['credits'],
            'role' => $user['role'],
            'name' => $user['name'],
            'plan_type' => $user['plan_type'],
            'subscription_status' => $user['subscription_status']
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>