<?php

use App\Core\Auth;
use App\Core\Peticion;
use App\Core\Permisos;
use App\Core\Respuesta;
use App\Models\Almacen;

$usuario = Auth::requerirSesionApi();

if (!Permisos::puedeVerVista($usuario, 'almacenes')) {
    Respuesta::error('No tiene permiso para administrar almacenes.', 403);
}

$metodo = $_SERVER['REQUEST_METHOD'];
$esGerenciaGlobal = in_array($usuario['rol'], ['super_admin', 'admin_general'], true);
$almacenesPermitidos = Permisos::almacenesPermitidos($usuario);

if ($metodo === 'GET') {
    $almacenes = Almacen::listar($almacenesPermitidos);

    if (($_GET['export'] ?? '') === 'csv') {
        $filas = array_map(static fn ($fila) => [$fila['id_almacen'], $fila['nombre'], $fila['ubicacion']], $almacenes);
        Respuesta::csv('almacenes.csv', ['ID Almacén', 'Nombre', 'Ubicación'], $filas);
    }

    Respuesta::json(['datos' => $almacenes, 'total' => count($almacenes)]);
}

if ($metodo === 'POST') {
    if (!$esGerenciaGlobal) {
        Respuesta::error('Solo un administrador general puede crear almacenes.', 403);
    }
    Peticion::exigirCsrf();

    $datos = Peticion::cuerpoJson();
    if (empty($datos['nombre'])) {
        Respuesta::error('El campo nombre es obligatorio.', 422);
    }

    $id = Almacen::crear($datos);
    Respuesta::json(['ok' => true, 'id_almacen' => $id], 201);
}

if ($metodo === 'PUT') {
    Peticion::exigirCsrf();
    $datos = Peticion::cuerpoJson();
    $id = (int) ($datos['id_almacen'] ?? 0);
    if (!$id || empty($datos['nombre'])) {
        Respuesta::error('id_almacen y nombre son obligatorios.', 422);
    }
    if (!Permisos::tieneAccesoAlmacen($usuario, $id)) {
        Respuesta::error('No tiene acceso a ese almacén.', 403);
    }

    Almacen::actualizar($id, $datos);
    Respuesta::json(['ok' => true]);
}

if ($metodo === 'DELETE') {
    if (!$esGerenciaGlobal) {
        Respuesta::error('Solo un administrador general puede eliminar almacenes.', 403);
    }
    Peticion::exigirCsrf();

    $id = (int) ($_GET['id_almacen'] ?? 0);
    if (!$id) {
        Respuesta::error('id_almacen es obligatorio.', 422);
    }

    Almacen::eliminar($id);
    Respuesta::json(['ok' => true]);
}

Respuesta::error('Método no soportado.', 405);
