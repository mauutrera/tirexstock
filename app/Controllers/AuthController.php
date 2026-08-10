<?php

namespace App\Controllers;

use App\Core\Auth;
use App\Core\Router;

class AuthController
{
    public function mostrarFormulario(): void
    {
        if (Auth::estaAutenticado()) {
            $usuario = Auth::usuarioActual();
            header('Location: /' . Router::rutaInicial($usuario));
            exit;
        }

        header('Cache-Control: no-store');

        $autenticado = false;
        $usuario = null;
        $vistaInicial = 'login';
        require APP_ROOT . '/views/layout.php';
    }
}
