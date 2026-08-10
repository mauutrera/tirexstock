<?php

use App\Core\Auth;
use App\Core\Peticion;
use App\Core\Respuesta;
use App\Core\Router;
use App\Models\Usuario;

$metodo = $_SERVER['REQUEST_METHOD'];
$accion = $_GET['accion'] ?? '';

if ($metodo === 'GET' && $accion === 'me') {
    $usuario = Auth::usuarioActual();
    if (!$usuario) {
        Respuesta::error('No autenticado', 401);
    }

    Respuesta::json([
        'usuario' => $usuario,
        'csrf_token' => Auth::csrfToken(),
        'ruta_inicial' => Router::rutaInicial($usuario),
    ]);
}

if ($metodo === 'POST' && $accion === 'logout') {
    Auth::requerirSesionApi();
    Peticion::exigirCsrf();
    Auth::cerrarSesion();
    Respuesta::json(['ok' => true]);
}

if ($metodo === 'POST' && $accion === 'tema') {
    $usuario = Auth::requerirSesionApi();
    Peticion::exigirCsrf();
    $datos = Peticion::cuerpoJson();
    $tema = $datos['tema'] ?? '';

    if (!in_array($tema, ['claro', 'oscuro'], true)) {
        Respuesta::error('Tema inválido.', 422);
    }

    Usuario::actualizarTema((int) $usuario['id_usuario'], $tema);
    Respuesta::json(['ok' => true]);
}

if ($metodo === 'POST' && $accion === '') {
    $datos = Peticion::cuerpoJson();
    $email = trim($datos['email'] ?? '');
    $password = (string) ($datos['password'] ?? '');

    if ($email === '' || $password === '') {
        Respuesta::error('Email y contraseña son obligatorios.', 422);
    }

    if (!Auth::intentarLogin($email, $password)) {
        Respuesta::error('Credenciales inválidas.', 401);
    }

    $usuario = Auth::usuarioActual();
    Respuesta::json([
        'usuario' => $usuario,
        'csrf_token' => Auth::csrfToken(),
        'ruta_inicial' => Router::rutaInicial($usuario),
    ]);
}

Respuesta::error('Acción no soportada.', 404);
