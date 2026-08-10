<?php

/**
 * Único punto de entrada HTTP. Enruta tanto las vistas iniciales de la SPA
 * como las llamadas a la API (/api/*).
 */

// Al usar el servidor embebido de PHP (`php -S`) para desarrollo, deja que
// sirva directamente los archivos estáticos existentes (css/js/iconos).
if (PHP_SAPI === 'cli-server') {
    $rutaSolicitada = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
    $rutaArchivo = __DIR__ . $rutaSolicitada;
    if ($rutaSolicitada !== '/' && is_file($rutaArchivo)) {
        return false;
    }
}

spl_autoload_register(function (string $clase): void {
    $prefijo = 'App\\';
    if (!str_starts_with($clase, $prefijo)) {
        return;
    }
    $rutaRelativa = str_replace('\\', '/', substr($clase, strlen($prefijo)));
    $archivo = __DIR__ . '/app/' . $rutaRelativa . '.php';
    if (file_exists($archivo)) {
        require $archivo;
    }
});

require __DIR__ . '/config/config.php';

App\Core\Router::despachar();
