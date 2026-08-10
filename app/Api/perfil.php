<?php

use App\Core\Auth;
use App\Core\Peticion;
use App\Core\Respuesta;
use App\Models\Usuario;

/**
 * Autoservicio de cuenta: cualquier usuario autenticado edita sus propios
 * nombre/email/departamento y, opcionalmente, su contraseña. Nunca toca
 * rol, almacenes ni permisos — eso sigue siendo exclusivo de
 * Administración de Usuarios (app/Api/usuarios.php).
 */
$usuario = Auth::requerirSesionApi();
$metodo = $_SERVER['REQUEST_METHOD'];

if ($metodo === 'GET') {
    Respuesta::json(['usuario' => $usuario]);
}

if ($metodo === 'PUT') {
    Peticion::exigirCsrf();
    $datos = Peticion::cuerpoJson();

    if (empty($datos['nombre']) || empty($datos['email'])) {
        Respuesta::error('Nombre y email son obligatorios.', 422);
    }

    if (!empty($datos['password_nueva'])) {
        if (empty($datos['password_actual'])) {
            Respuesta::error('Debe indicar su contraseña actual para cambiarla.', 422);
        }
        if (strlen($datos['password_nueva']) < 8) {
            Respuesta::error('La nueva contraseña debe tener al menos 8 caracteres.', 422);
        }

        $cambiada = Usuario::cambiarPassword((int) $usuario['id_usuario'], $datos['password_actual'], $datos['password_nueva']);
        if (!$cambiada) {
            Respuesta::error('La contraseña actual no es correcta.', 422);
        }
    }

    try {
        Usuario::actualizarPerfilPropio((int) $usuario['id_usuario'], $datos);
    } catch (\PDOException $e) {
        Respuesta::error('Ese email ya está en uso por otro usuario.', 422);
    }

    Respuesta::json(['ok' => true, 'usuario' => Auth::usuarioActual()]);
}

Respuesta::error('Método no soportado.', 405);
