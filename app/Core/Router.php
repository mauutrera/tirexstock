<?php

namespace App\Core;

use App\Controllers\AlmacenesController;
use App\Controllers\AuthController;
use App\Controllers\ColeccionesController;
use App\Controllers\DashboardController;
use App\Controllers\EntradasController;
use App\Controllers\HistorialController;
use App\Controllers\InventarioController;
use App\Controllers\NotificacionesController;
use App\Controllers\PerfilController;
use App\Controllers\ReportesController;
use App\Controllers\SalidasController;
use App\Controllers\UsuariosController;

/**
 * Único enrutador HTTP. Distingue llamadas a la API (JSON) de rutas de
 * vista (shell SPA) y delega la verificación de sesión/permiso a cada
 * Controller o archivo de app/Api — el router nunca decide autorización él
 * mismo, solo despacha.
 */
class Router
{
    /** @var array<string, class-string> primer segmento de ruta => Controller */
    private const MAPA_VISTAS = [
        'dashboard' => DashboardController::class,
        'notificaciones' => NotificacionesController::class,
        'entradas' => EntradasController::class,
        'salidas' => SalidasController::class,
        'inventario' => InventarioController::class,
        'historial' => HistorialController::class,
        'reportes' => ReportesController::class,
        'colecciones' => ColeccionesController::class,
        'almacenes' => AlmacenesController::class,
        'usuarios' => UsuariosController::class,
        'perfil' => PerfilController::class,
    ];

    public static function despachar(): void
    {
        $ruta = self::rutaActual();

        if (str_starts_with($ruta, 'api/')) {
            self::despacharApi(substr($ruta, 4));
            return;
        }

        self::despacharVista($ruta);
    }

    private static function rutaActual(): string
    {
        $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

        return trim($uri, '/');
    }

    private static function despacharApi(string $ruta): void
    {
        $segmento = explode('/', $ruta)[0] ?: '';
        $archivo = APP_ROOT . '/app/Api/' . basename($segmento) . '.php';

        if ($segmento === '' || !file_exists($archivo)) {
            Respuesta::error('Endpoint no encontrado', 404);
        }

        require $archivo;
    }

    private static function despacharVista(string $ruta): void
    {
        $segmento = explode('/', $ruta)[0] ?: '';

        if ($segmento === 'login') {
            (new AuthController())->mostrarFormulario();
            return;
        }

        Auth::requerirSesion();
        $usuario = Auth::usuarioActual();

        if ($segmento === '') {
            header('Location: /' . self::rutaInicial($usuario));
            exit;
        }

        if (!array_key_exists($segmento, self::MAPA_VISTAS)) {
            http_response_code(404);
            echo '404 — vista no encontrada';
            exit;
        }

        $controladorClase = self::MAPA_VISTAS[$segmento];
        (new $controladorClase())->manejar();
    }

    /**
     * Primera vista accesible para el usuario según su rol/permisos, usada
     * para redirigir "/" y el login exitoso.
     */
    public static function rutaInicial(array $usuario): string
    {
        if (Permisos::esAdmin($usuario)) {
            return 'dashboard';
        }

        foreach (['entradas', 'salidas', 'inventario', 'historial'] as $vista) {
            if (Permisos::puedeVerVista($usuario, $vista)) {
                return $vista;
            }
        }

        return 'entradas';
    }
}
