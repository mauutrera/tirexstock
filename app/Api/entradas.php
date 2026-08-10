<?php

use App\Core\Auth;
use App\Core\Peticion;
use App\Core\Permisos;
use App\Core\Respuesta;
use App\Models\Historial;
use App\Models\Item;

$usuario = Auth::requerirSesionApi();

if (!Permisos::puedeVerVista($usuario, 'entradas')) {
    Respuesta::error('No tiene permiso para ver esta vista.', 403);
}

$metodo = $_SERVER['REQUEST_METHOD'];
$almacenesPermitidos = Permisos::almacenesPermitidos($usuario);

if ($metodo === 'GET') {
    $filtros = array_filter([
        'numero_serie' => $_GET['numero_serie'] ?? null,
        'notas_entrada' => $_GET['notas_entrada'] ?? null,
        'id_coleccion' => $_GET['id_coleccion'] ?? null,
        'id_almacen' => $_GET['id_almacen'] ?? null,
        'usuario_registra' => $_GET['usuario_registra'] ?? null,
        'fecha_ingreso' => $_GET['fecha'] ?? null,
        'fecha_ingreso_desde' => $_GET['fecha_desde'] ?? null,
        'fecha_ingreso_hasta' => $_GET['fecha_hasta'] ?? null,
    ], static fn ($v) => $v !== null && $v !== '');

    $resultado = Item::listarEntradas($filtros, Peticion::pagina(), REGISTROS_POR_PAGINA, $almacenesPermitidos);

    if (($_GET['export'] ?? '') === 'csv') {
        $filas = array_map(static fn ($fila) => [
            $fila['fecha_ingreso'], $fila['usuario_registra_nombre'], $fila['coleccion_descripcion'],
            $fila['almacen_nombre'], $fila['numero_serie'], $fila['notas_entrada'],
        ], $resultado['datos']);

        Respuesta::csv('entradas.csv', ['Fecha', 'Usuario que Registra', 'Colección', 'Almacén', 'Número de Serie', 'Notas de Entrada'], $filas);
    }

    Respuesta::json($resultado + ['pagina' => Peticion::pagina(), 'por_pagina' => REGISTROS_POR_PAGINA]);
}

if ($metodo === 'POST') {
    if (!Permisos::puedeRealizarAccion($usuario, 'agregar_entrada')) {
        Respuesta::error('No tiene permiso para agregar entradas.', 403);
    }
    Peticion::exigirCsrf();

    $datos = Peticion::cuerpoJson();
    foreach (['numero_serie', 'id_coleccion'] as $campo) {
        if (empty($datos[$campo])) {
            Respuesta::error("El campo '$campo' es obligatorio.", 422);
        }
    }

    // El almacén de la entrada es siempre el de la colección elegida (cada
    // fila de colecciones ya representa una combinación colección+almacén);
    // nunca se confía en un id_almacen enviado por el cliente.
    $coleccion = \App\Models\Coleccion::buscarPorId((int) $datos['id_coleccion']);
    if (!$coleccion) {
        Respuesta::error('La colección indicada no existe.', 422);
    }
    if (!Permisos::tieneAccesoAlmacen($usuario, (int) $coleccion['id_almacen'])) {
        Respuesta::error('No tiene acceso a ese almacén.', 403);
    }
    $datos['id_almacen'] = $coleccion['id_almacen'];

    try {
        $datos['usuario_registra'] = $usuario['id_usuario'];
        Item::crearEntrada($datos);
        Historial::registrar((int) $usuario['id_usuario'], 'ingreso', $datos['numero_serie'], (int) $datos['id_coleccion'], 'Ingreso registrado: ' . $datos['numero_serie']);
        Respuesta::json(['ok' => true], 201);
    } catch (\Throwable $e) {
        Respuesta::error('No se pudo registrar la entrada: ' . $e->getMessage(), 422);
    }
}

if ($metodo === 'PUT') {
    if (!Permisos::puedeEditarRegistros($usuario)) {
        Respuesta::error('Editar entradas requiere permisos de administrador.', 403);
    }
    Peticion::exigirCsrf();

    $datos = Peticion::cuerpoJson();
    $serie = $datos['numero_serie'] ?? '';
    if ($serie === '') {
        Respuesta::error('numero_serie es obligatorio.', 422);
    }

    $item = Item::buscarPorSerie($serie);
    if (!$item || !Permisos::tieneAccesoAlmacen($usuario, (int) $item['id_almacen'])) {
        Respuesta::error('Ítem no encontrado.', 404);
    }

    $coleccion = \App\Models\Coleccion::buscarPorId((int) $datos['id_coleccion']);
    if (!$coleccion || !Permisos::tieneAccesoAlmacen($usuario, (int) $coleccion['id_almacen'])) {
        Respuesta::error('La colección indicada no existe o no tiene acceso a su almacén.', 422);
    }
    $datos['id_almacen'] = $coleccion['id_almacen'];

    Item::actualizarEntrada($serie, $datos);
    Historial::registrar((int) $usuario['id_usuario'], 'edicion', $serie, (int) $datos['id_coleccion'], 'Entrada editada: ' . $serie);
    Respuesta::json(['ok' => true]);
}

if ($metodo === 'DELETE') {
    if (!Permisos::puedeRealizarAccion($usuario, 'eliminar_entrada')) {
        Respuesta::error('No tiene permiso para eliminar entradas.', 403);
    }
    Peticion::exigirCsrf();

    $serie = $_GET['numero_serie'] ?? '';
    if ($serie === '') {
        Respuesta::error('numero_serie es obligatorio.', 422);
    }

    $item = Item::buscarPorSerie($serie);
    if (!$item || !Permisos::tieneAccesoAlmacen($usuario, (int) $item['id_almacen'])) {
        Respuesta::error('Ítem no encontrado.', 404);
    }

    try {
        Item::eliminarEntrada($serie);
        Historial::registrar((int) $usuario['id_usuario'], 'eliminacion', $serie, (int) $item['id_coleccion'], 'Entrada eliminada: ' . $serie);
        Respuesta::json(['ok' => true]);
    } catch (\Throwable $e) {
        Respuesta::error($e->getMessage(), 422);
    }
}

Respuesta::error('Método no soportado.', 405);
