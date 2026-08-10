<?php

namespace App\Controllers;

use App\Core\Auth;
use App\Core\Permisos;
use App\Core\Router;

/**
 * Controladores de vista delgados por diseño: la SPA renderiza en el
 * cliente; el controlador solo verifica sesión + permiso de la vista y
 * sirve el shell único (views/layout.php).
 */
abstract class BaseController
{
    protected string $vista;

    public function manejar(): void
    {
        Auth::requerirSesion();
        $usuario = Auth::usuarioActual();

        if (!Permisos::puedeVerVista($usuario, $this->vista)) {
            header('Location: /' . Router::rutaInicial($usuario));
            exit;
        }

        $this->renderizar($usuario);
    }

    protected function renderizar(array $usuario): void
    {
        // El shell incrusta el token CSRF de la sesión actual: nunca debe
        // quedar en caché del navegador (evita un token desincronizado tras
        // un logout/login).
        header('Cache-Control: no-store');

        $autenticado = true;
        $vistaInicial = $this->vista;
        require APP_ROOT . '/views/layout.php';
    }
}
