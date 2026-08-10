<?php

use App\Core\Auth;
use App\Core\Peticion;
use App\Core\Permisos;
use App\Core\Respuesta;
use App\Models\Usuario;

$usuario = Auth::requerirSesionApi();

if (!Permisos::puedeVerVista($usuario, 'usuarios')) {
    Respuesta::error('No tiene permiso para administrar usuarios.', 403);
}

$metodo = $_SERVER['REQUEST_METHOD'];
$esGerenciaGlobal = in_array($usuario['rol'], ['super_admin', 'admin_general'], true);
$almacenesPermitidos = Permisos::almacenesPermitidos($usuario);

/** Solo super_admin puede crear/editar otros administradores (jerarquía 4.1). */
function validarRolDestino(array $usuarioActual, string $rolDestino): void
{
    if ($rolDestino !== 'usuario_normal' && $usuarioActual['rol'] !== 'super_admin') {
        Respuesta::error('Solo un Super Admin puede crear o editar administradores.', 403);
    }
}

function validarAlmacenesAsignados(array $usuarioActual, array $idsAlmacen): void
{
    foreach ($idsAlmacen as $idAlmacen) {
        if (!Permisos::tieneAccesoAlmacen($usuarioActual, (int) $idAlmacen)) {
            Respuesta::error('No tiene acceso a uno de los almacenes indicados.', 403);
        }
    }
}

if ($metodo === 'GET') {
    $usuarios = Usuario::listar($almacenesPermitidos);
    foreach ($usuarios as &$fila) {
        $fila['almacenes'] = Usuario::almacenesAsignados((int) $fila['id_usuario']);
    }
    unset($fila);

    if (($_GET['export'] ?? '') === 'csv') {
        $filas = array_map(static fn ($fila) => [
            $fila['id_usuario'], $fila['nombre'], $fila['departamento'], $fila['rol'],
            implode(', ', array_column($fila['almacenes'], 'nombre')),
        ], $usuarios);

        Respuesta::csv('usuarios.csv', ['ID Usuario', 'Nombre', 'Departamento', 'Rol', 'Almacén(es) Asignado(s)'], $filas);
    }

    Respuesta::json(['datos' => $usuarios, 'total' => count($usuarios)]);
}

if ($metodo === 'POST') {
    Peticion::exigirCsrf();
    $datos = Peticion::cuerpoJson();

    foreach (['nombre', 'email', 'password', 'rol'] as $campo) {
        if (empty($datos[$campo])) {
            Respuesta::error("El campo '$campo' es obligatorio.", 422);
        }
    }
    validarRolDestino($usuario, $datos['rol']);

    $idsAlmacen = array_map('intval', $datos['almacenes'] ?? []);
    validarAlmacenesAsignados($usuario, $idsAlmacen);

    $id = Usuario::crear($datos);
    if ($idsAlmacen) {
        Usuario::asignarAlmacenes($id, $idsAlmacen);
    }
    if (!empty($datos['permisos']) && is_array($datos['permisos'])) {
        Usuario::guardarPermisos($id, $datos['permisos']);
    }

    Respuesta::json(['ok' => true, 'id_usuario' => $id], 201);
}

if ($metodo === 'PUT') {
    Peticion::exigirCsrf();
    $datos = Peticion::cuerpoJson();
    $id = (int) ($datos['id_usuario'] ?? 0);
    if (!$id || empty($datos['nombre']) || empty($datos['email']) || empty($datos['rol'])) {
        Respuesta::error('id_usuario, nombre, email y rol son obligatorios.', 422);
    }

    $objetivo = Usuario::buscarPorId($id);
    if (!$objetivo) {
        Respuesta::error('Usuario no encontrado.', 404);
    }
    validarRolDestino($usuario, $datos['rol']);
    validarRolDestino($usuario, $objetivo['rol']);

    if (isset($datos['almacenes'])) {
        $idsAlmacen = array_map('intval', $datos['almacenes']);
        validarAlmacenesAsignados($usuario, $idsAlmacen);
        Usuario::asignarAlmacenes($id, $idsAlmacen);
    }
    if (!empty($datos['permisos']) && is_array($datos['permisos'])) {
        Usuario::guardarPermisos($id, $datos['permisos']);
    }

    Usuario::actualizar($id, $datos);
    Respuesta::json(['ok' => true]);
}

if ($metodo === 'DELETE') {
    Peticion::exigirCsrf();
    $id = (int) ($_GET['id_usuario'] ?? 0);
    if (!$id) {
        Respuesta::error('id_usuario es obligatorio.', 422);
    }

    $objetivo = Usuario::buscarPorId($id);
    if (!$objetivo) {
        Respuesta::error('Usuario no encontrado.', 404);
    }
    validarRolDestino($usuario, $objetivo['rol']);

    Usuario::eliminar($id);
    Respuesta::json(['ok' => true]);
}

Respuesta::error('Método no soportado.', 405);
