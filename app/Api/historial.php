<?php

use App\Core\Auth;
use App\Core\Peticion;
use App\Core\Permisos;
use App\Core\Respuesta;
use App\Models\Historial;

$usuario = Auth::requerirSesionApi();

if (!Permisos::puedeVerVista($usuario, 'historial')) {
    Respuesta::error('No tiene permiso para ver esta vista.', 403);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Respuesta::error('Método no soportado.', 405);
}

$almacenesPermitidos = Permisos::almacenesPermitidos($usuario);

$filtros = array_filter([
    'numero_serie' => $_GET['numero_serie'] ?? null,
    'id_coleccion' => $_GET['id_coleccion'] ?? null,
    'id_usuario' => $_GET['id_usuario'] ?? null,
    'tipo_operacion' => $_GET['tipo_operacion'] ?? null,
    'fecha_desde' => $_GET['fecha_desde'] ?? null,
    'fecha_hasta' => $_GET['fecha_hasta'] ?? null,
], static fn ($v) => $v !== null && $v !== '');

$resultado = Historial::listar($filtros, Peticion::pagina(), REGISTROS_POR_PAGINA, $almacenesPermitidos);

if (($_GET['export'] ?? '') === 'csv') {
    $filas = array_map(static fn ($fila) => [
        $fila['fecha_operacion'], $fila['tipo_operacion'], $fila['usuario_nombre'],
        $fila['numero_serie'], $fila['coleccion_descripcion'], $fila['detalle'],
    ], $resultado['datos']);

    Respuesta::csv('historial.csv', ['Fecha de Operación', 'Tipo de Operación', 'Usuario', 'Número de Serie', 'Colección', 'Detalle'], $filas);
}

Respuesta::json($resultado + ['pagina' => Peticion::pagina(), 'por_pagina' => REGISTROS_POR_PAGINA]);
