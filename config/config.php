<?php
/**
 * Configuración general de la aplicación.
 */

define('APP_ROOT', dirname(__DIR__));
define('APP_ENV', getenv('APP_ENV') ?: 'development');
define('APP_NAME', 'TirexStock');

// Duración de sesión por inactividad (minutos).
define('SESSION_LIFETIME_MINUTES', 120);

// Umbral de stock bajo por defecto para colecciones nuevas.
define('UMBRAL_STOCK_BAJO_DEFECTO', 2);

// Registros por página en listados paginados.
define('REGISTROS_POR_PAGINA', 20);

date_default_timezone_set('America/Bogota');

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_name('inventariocol_sesion');
    session_start();
}

// Expiración de sesión por inactividad.
if (!empty($_SESSION['usuario_id'])) {
    $ultimaActividad = $_SESSION['ultima_actividad'] ?? time();
    if ((time() - $ultimaActividad) > (SESSION_LIFETIME_MINUTES * 60)) {
        $_SESSION = [];
        session_destroy();
        session_start();
    }
    $_SESSION['ultima_actividad'] = time();
}
