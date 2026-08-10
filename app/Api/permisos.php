<?php

use App\Core\Auth;
use App\Core\Peticion;
use App\Core\Permisos;
use App\Core\Respuesta;
use App\Models\Usuario;

/**
 * Configuración de permisos (vistas y acciones) de un usuario normal —
 * sección 4.2. Complementa a usuarios.php: aquí se listan/editan solo los
 * permisos, sin tocar los demás datos del usuario.
 */
const CLAVES_VISTA = ['vista_entradas', 'vista_salidas', 'vista_inventario', 'vista_historial'];
const CLAVES_ACCION = ['accion_agregar_entrada', 'accion_eliminar_entrada', 'accion_marcar_salida', 'accion_desmarcar_salida'];

$usuario = Auth::requerirSesionApi();

if (!Permisos::puedeAdministrarUsuarios($usuario)) {
    Respuesta::error('No tiene permiso para configurar permisos de usuarios.', 403);
}

$metodo = $_SERVER['REQUEST_METHOD'];

if ($metodo === 'GET') {
    $idUsuario = (int) ($_GET['id_usuario'] ?? 0);
    $objetivo = $idUsuario ? Usuario::buscarPorId($idUsuario) : null;
    if (!$objetivo || $objetivo['rol'] !== 'usuario_normal') {
        Respuesta::error('Usuario no encontrado o no es un usuario normal.', 404);
    }

    $actuales = Usuario::permisos($idUsuario);
    $permisos = [];
    foreach ([...CLAVES_VISTA, ...CLAVES_ACCION] as $clave) {
        $permisos[$clave] = $actuales[$clave] ?? false;
    }

    Respuesta::json(['id_usuario' => $idUsuario, 'permisos' => $permisos]);
}

if ($metodo === 'PUT') {
    Peticion::exigirCsrf();
    $datos = Peticion::cuerpoJson();
    $idUsuario = (int) ($datos['id_usuario'] ?? 0);
    $objetivo = $idUsuario ? Usuario::buscarPorId($idUsuario) : null;
    if (!$objetivo || $objetivo['rol'] !== 'usuario_normal') {
        Respuesta::error('Usuario no encontrado o no es un usuario normal.', 404);
    }

    $permisos = [];
    foreach ([...CLAVES_VISTA, ...CLAVES_ACCION] as $clave) {
        if (array_key_exists($clave, $datos['permisos'] ?? [])) {
            $permisos[$clave] = !empty($datos['permisos'][$clave]);
        }
    }

    Usuario::guardarPermisos($idUsuario, $permisos);
    Respuesta::json(['ok' => true]);
}

Respuesta::error('Método no soportado.', 405);
