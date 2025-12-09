<?php
function getDb()
{
    $dbPath = __DIR__ . '/../database.sqlite';
    try {
        $db = new PDO("sqlite:$dbPath");
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

        // Ensure table exists
        $db->exec("CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            credits INTEGER DEFAULT 0,
            role TEXT DEFAULT 'user',
            status TEXT DEFAULT 'active',
            name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )");

        // Attempt migrations (silently fail if columns exist)
        try {
            $db->exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
        } catch (Exception $e) {
        }
        try {
            $db->exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'");
        } catch (Exception $e) {
        }
        try {
            $db->exec("ALTER TABLE users ADD COLUMN name TEXT");
        } catch (Exception $e) {
        }

        return $db;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
        exit;
    }
}
?>