<?php

use App\Core\Auth;
use App\Core\Peticion;
use App\Core\Permisos;
use App\Core\Respuesta;
use App\Models\Historial;
use App\Models\Item;

$usuario = Auth::requerirSesionApi();

if (!Permisos::puedeVerVista($usuario, 'salidas')) {
    Respuesta::error('No tiene permiso para ver esta vista.', 403);
}

$metodo = $_SERVER['REQUEST_METHOD'];
$almacenesPermitidos = Permisos::almacenesPermitidos($usuario);

if ($metodo === 'GET' && isset($_GET['buscar'])) {
    $texto = trim($_GET['buscar']);
    $items = $texto === '' ? [] : Item::buscarDisponiblesPorSerie($texto, $almacenesPermitidos);

    Respuesta::json(['items' => $items]);
}

if ($metodo === 'GET') {
    $filtros = array_filter([
        'numero_serie' => $_GET['numero_serie'] ?? null,
        'notas_salida' => $_GET['notas_salida'] ?? null,
        'id_coleccion' => $_GET['id_coleccion'] ?? null,
        'id_almacen' => $_GET['id_almacen'] ?? null,
        'usuario_retira' => $_GET['usuario_retira'] ?? null,
        'unidad_percibida' => $_GET['unidad_percibida'] ?? null,
        'fecha_salida' => $_GET['fecha'] ?? null,
        'fecha_salida_desde' => $_GET['fecha_desde'] ?? null,
        'fecha_salida_hasta' => $_GET['fecha_hasta'] ?? null,
    ], static fn ($v) => $v !== null && $v !== '');

    $resultado = Item::listarSalidas($filtros, Peticion::pagina(), REGISTROS_POR_PAGINA, $almacenesPermitidos);

    if (($_GET['export'] ?? '') === 'csv') {
        $filas = array_map(static fn ($fila) => [
            $fila['fecha_salida'], $fila['usuario_retira_nombre'], $fila['coleccion_descripcion'],
            $fila['almacen_nombre'], $fila['numero_serie'], $fila['responsable_recibe'],
            $fila['unidad_percibida'], $fila['posicion'], $fila['notas_salida'],
        ], $resultado['datos']);

        Respuesta::csv('salidas.csv', ['Fecha', 'Usuario que Retira', 'Colección', 'Almacén', 'Número de Serie', 'Responsable que Recibe', 'Unidad Percibida', 'Posición', 'Notas de Salida'], $filas);
    }

    Respuesta::json($resultado + ['pagina' => Peticion::pagina(), 'por_pagina' => REGISTROS_POR_PAGINA]);
}

if ($metodo === 'POST') {
    if (!Permisos::puedeRealizarAccion($usuario, 'marcar_salida')) {
        Respuesta::error('No tiene permiso para marcar salidas.', 403);
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

    try {
        $datos['usuario_retira'] = $usuario['id_usuario'];
        Item::marcarSalida($serie, $datos);
        Historial::registrar((int) $usuario['id_usuario'], 'salida', $serie, (int) $item['id_coleccion'], 'Salida registrada: ' . $serie);
        Respuesta::json(['ok' => true], 201);
    } catch (\Throwable $e) {
        Respuesta::error('No se pudo registrar la salida: ' . $e->getMessage(), 422);
    }
}

if ($metodo === 'PUT') {
    if (!Permisos::puedeEditarRegistros($usuario)) {
        Respuesta::error('Editar salidas requiere permisos de administrador.', 403);
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

    Item::actualizarSalida($serie, $datos);
    Historial::registrar((int) $usuario['id_usuario'], 'edicion', $serie, (int) $item['id_coleccion'], 'Salida editada: ' . $serie);
    Respuesta::json(['ok' => true]);
}

if ($metodo === 'DELETE') {
    if (!Permisos::puedeRealizarAccion($usuario, 'desmarcar_salida')) {
        Respuesta::error('No tiene permiso para desmarcar salidas.', 403);
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
        Item::desmarcarSalida($serie);
        Historial::registrar((int) $usuario['id_usuario'], 'desmarque_salida', $serie, (int) $item['id_coleccion'], 'Salida desmarcada (baja lógica): ' . $serie);
        Respuesta::json(['ok' => true]);
    } catch (\Throwable $e) {
        Respuesta::error($e->getMessage(), 422);
    }
}

Respuesta::error('Método no soportado.', 405);
