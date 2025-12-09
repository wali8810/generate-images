<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'db.php';

$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? '';
$token = str_replace('Bearer ', '', $authHeader);

if (!$token) {
    http_response_code(401);
    exit;
}

// Verify Token (Simple implementation matching register.php)
$parts = explode('.', $token);
if (count($parts) !== 3) {
    http_response_code(403);
    exit;
}

$payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1])), true);
if (!$payload || !isset($payload['id'])) {
    http_response_code(403);
    exit;
}

$userId = $payload['id'];
$db = getDb();

try {
    $stmt = $db->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if (!$user) {
        http_response_code(404);
        exit;
    }

    // Check Daily Reset
    if ($user['plan_type'] === 'daily') {
        $today = date('Y-m-d');
        if ($user['last_daily_reset'] !== $today) {
            $updateStmt = $db->prepare("UPDATE users SET credits = 10, last_daily_reset = ? WHERE id = ?");
            $updateStmt->execute([$today, $userId]);
            $user['credits'] = 10;
            $user['last_daily_reset'] = $today;
        }
    }

    echo json_encode([
        'user' => [
            'id' => $user['id'],
            'email' => $user['email'],
            'credits' => $user['credits'],
            'role' => $user['role'],
            'name' => $user['name'],
            'plan_type' => $user['plan_type'],
            'subscription_status' => $user['subscription_status'],
            'subscription_renewal' => $user['subscription_renewal']
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>