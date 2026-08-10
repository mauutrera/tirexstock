<?php
/**
 * Configuración de conexión a base de datos.
 * SQLite en desarrollo, MySQL en producción — el mismo código de modelos
 * (vía app/Core/Database.php) funciona contra ambas sin modificaciones.
 */

return [
    'driver' => APP_ENV === 'production' ? 'mysql' : 'sqlite',

    'sqlite' => [
        'path' => APP_ROOT . '/database/dev.sqlite',
        'schema' => APP_ROOT . '/database/schema_sqlite.sql',
        'seed' => APP_ROOT . '/database/seed_sqlite.sql',
    ],

    'mysql' => [
        'host' => getenv('DB_HOST') ?: '127.0.0.1',
        'port' => getenv('DB_PORT') ?: '3306',
        'database' => getenv('DB_DATABASE') ?: 'inventario_colecciones',
        'username' => getenv('DB_USERNAME') ?: 'root',
        'password' => getenv('DB_PASSWORD') ?: '',
        'charset' => 'utf8mb4',
    ],
];
