<?php

use App\Core\Auth;
use App\Core\Peticion;
use App\Core\Permisos;
use App\Core\Respuesta;
use App\Models\Coleccion;
use App\Models\Item;

$usuario = Auth::requerirSesionApi();

if (!Permisos::puedeVerVista($usuario, 'inventario')) {
    Respuesta::error('No tiene permiso para ver esta vista.', 403);
}

$metodo = $_SERVER['REQUEST_METHOD'];
if ($metodo !== 'GET') {
    Respuesta::error('Método no soportado.', 405);
}

$almacenesPermitidos = Permisos::almacenesPermitidos($usuario);

// Vista de Detalle de Colección (5.5): ?coleccion=ID&estado=todas|sin_salida|con_salida
if (!empty($_GET['coleccion'])) {
    $idColeccion = (int) $_GET['coleccion'];
    $coleccion = Coleccion::buscarPorId($idColeccion);

    if (!$coleccion || !Permisos::tieneAccesoAlmacen($usuario, (int) $coleccion['id_almacen'])) {
        Respuesta::error('Colección no encontrada.', 404);
    }

    $estado = in_array($_GET['estado'] ?? 'todas', ['sin_salida', 'con_salida'], true) ? $_GET['estado'] : 'todas';
    $filtros = array_filter([
        'numero_serie' => $_GET['numero_serie'] ?? null,
        'notas_entrada' => $_GET['notas_entrada'] ?? null,
        'notas_salida' => $_GET['notas_salida'] ?? null,
    ], static fn ($v) => $v !== null && $v !== '');

    $resultado = Item::listarPorColeccion($idColeccion, $estado, $filtros, Peticion::pagina(), REGISTROS_POR_PAGINA);

    if (($_GET['export'] ?? '') === 'csv') {
        $filas = array_map(static fn ($fila) => [
            $fila['numero_serie'], $fila['fecha_ingreso'], $fila['usuario_registra_nombre'],
            $fila['fecha_salida'], $fila['usuario_retira_nombre'], $fila['responsable_recibe'],
            $fila['notas_entrada'], $fila['notas_salida'],
        ], $resultado['datos']);

        Respuesta::csv('detalle_coleccion.csv', ['Número de Serie', 'Fecha de Ingreso', 'Usuario que Registra', 'Fecha de Salida', 'Usuario que Retira', 'Responsable que Recibe', 'Notas de Entrada', 'Notas de Salida'], $filas);
    }

    Respuesta::json(['coleccion' => $coleccion] + $resultado + ['pagina' => Peticion::pagina(), 'por_pagina' => REGISTROS_POR_PAGINA]);
}

// Vista de Inventario (5.4): listado de colecciones con stock calculado.
$filtros = array_filter([
    'id_almacen' => $_GET['id_almacen'] ?? null,
    'item' => $_GET['item'] ?? null,
    'tipo' => $_GET['tipo'] ?? null,
    'medidas' => $_GET['medidas'] ?? null,
    'descripcion' => $_GET['descripcion'] ?? null,
], static fn ($v) => $v !== null && $v !== '');

if (!empty($filtros['id_almacen']) && !Permisos::tieneAccesoAlmacen($usuario, (int) $filtros['id_almacen'])) {
    Respuesta::error('No tiene acceso a ese almacén.', 403);
}

$resultado = Coleccion::listar($filtros, Peticion::pagina(), REGISTROS_POR_PAGINA, $almacenesPermitidos);

if (($_GET['export'] ?? '') === 'csv') {
    $filas = array_map(static fn ($fila) => [
        $fila['id_coleccion'], $fila['descripcion'], $fila['item'], $fila['tipo'],
        $fila['medidas'], $fila['nombre_almacen'], $fila['stock'],
    ], $resultado['datos']);

    Respuesta::csv('inventario.csv', ['ID Colección', 'Descripción', 'Ítem', 'Tipo', 'Medidas', 'Almacén', 'Stock'], $filas);
}

Respuesta::json($resultado + ['pagina' => Peticion::pagina(), 'por_pagina' => REGISTROS_POR_PAGINA]);
