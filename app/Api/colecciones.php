<?php

use App\Core\Auth;
use App\Core\Peticion;
use App\Core\Permisos;
use App\Core\Respuesta;
use App\Models\Coleccion;

$usuario = Auth::requerirSesionApi();

if (!Permisos::puedeVerVista($usuario, 'colecciones')) {
    Respuesta::error('No tiene permiso para administrar colecciones.', 403);
}

$metodo = $_SERVER['REQUEST_METHOD'];
$almacenesPermitidos = Permisos::almacenesPermitidos($usuario);

if ($metodo === 'GET') {
    $filtros = array_filter([
        'id_almacen' => $_GET['id_almacen'] ?? null,
        'item' => $_GET['item'] ?? null,
        'tipo' => $_GET['tipo'] ?? null,
        'medidas' => $_GET['medidas'] ?? null,
        'descripcion' => $_GET['descripcion'] ?? null,
    ], static fn ($v) => $v !== null && $v !== '');

    $resultado = Coleccion::listar($filtros, Peticion::pagina(), REGISTROS_POR_PAGINA, $almacenesPermitidos);

    if (($_GET['export'] ?? '') === 'csv') {
        $filas = array_map(static fn ($fila) => [
            $fila['id_coleccion'], $fila['descripcion'], $fila['item'], $fila['tipo'],
            $fila['medidas'], $fila['nombre_almacen'],
        ], $resultado['datos']);

        Respuesta::csv('colecciones.csv', ['ID Colección', 'Descripción', 'Ítem', 'Tipo', 'Medidas', 'Almacén'], $filas);
    }

    Respuesta::json($resultado + ['pagina' => Peticion::pagina(), 'por_pagina' => REGISTROS_POR_PAGINA]);
}

if ($metodo === 'POST') {
    Peticion::exigirCsrf();
    $datos = Peticion::cuerpoJson();

    foreach (['descripcion', 'item', 'tipo', 'medidas', 'id_almacen'] as $campo) {
        if (empty($datos[$campo])) {
            Respuesta::error("El campo '$campo' es obligatorio.", 422);
        }
    }
    if (!Permisos::tieneAccesoAlmacen($usuario, (int) $datos['id_almacen'])) {
        Respuesta::error('No tiene acceso a ese almacén.', 403);
    }

    $id = Coleccion::crear($datos);
    Respuesta::json(['ok' => true, 'id_coleccion' => $id], 201);
}

if ($metodo === 'PUT') {
    Peticion::exigirCsrf();
    $datos = Peticion::cuerpoJson();
    $id = (int) ($datos['id_coleccion'] ?? 0);
    if (!$id) {
        Respuesta::error('id_coleccion es obligatorio.', 422);
    }

    $coleccion = Coleccion::buscarPorId($id);
    if (!$coleccion || !Permisos::tieneAccesoAlmacen($usuario, (int) $coleccion['id_almacen'])) {
        Respuesta::error('Colección no encontrada.', 404);
    }
    if (!Permisos::tieneAccesoAlmacen($usuario, (int) $datos['id_almacen'])) {
        Respuesta::error('No tiene acceso a ese almacén.', 403);
    }

    Coleccion::actualizar($id, $datos);
    Respuesta::json(['ok' => true]);
}

if ($metodo === 'DELETE') {
    Peticion::exigirCsrf();
    $id = (int) ($_GET['id_coleccion'] ?? 0);
    if (!$id) {
        Respuesta::error('id_coleccion es obligatorio.', 422);
    }

    $coleccion = Coleccion::buscarPorId($id);
    if (!$coleccion || !Permisos::tieneAccesoAlmacen($usuario, (int) $coleccion['id_almacen'])) {
        Respuesta::error('Colección no encontrada.', 404);
    }

    Coleccion::eliminar($id);
    Respuesta::json(['ok' => true]);
}

Respuesta::error('Método no soportado.', 405);
