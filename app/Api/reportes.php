<?php

use App\Core\Auth;
use App\Core\Peticion;
use App\Core\Permisos;
use App\Core\Respuesta;
use App\Models\Coleccion;
use App\Models\Historial;
use App\Models\Item;

$usuario = Auth::requerirSesionApi();

if (!Permisos::puedeVerVista($usuario, 'reportes')) {
    Respuesta::error('No tiene permiso para ver reportes.', 403);
}
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Respuesta::error('Método no soportado.', 405);
}

$almacenesPermitidos = Permisos::almacenesPermitidos($usuario);
$tipo = $_GET['tipo'] ?? 'stock_coleccion_almacen';

switch ($tipo) {
    case 'stock_coleccion_almacen':
    case 'maestro_comparativo':
        $filtros = array_filter([
            'id_almacen' => $tipo === 'stock_coleccion_almacen' ? ($_GET['id_almacen'] ?? null) : null,
            'item' => $_GET['item'] ?? null,
            'tipo' => $_GET['tipo_llanta'] ?? null,
            'medidas' => $_GET['medidas'] ?? null,
            'descripcion' => $_GET['descripcion'] ?? null,
        ], static fn ($v) => $v !== null && $v !== '');

        $resultado = Coleccion::listar($filtros, Peticion::pagina(), REGISTROS_POR_PAGINA, $almacenesPermitidos);

        if (($_GET['export'] ?? '') === 'csv') {
            $filas = array_map(static fn ($f) => [$f['id_coleccion'], $f['descripcion'], $f['item'], $f['tipo'], $f['medidas'], $f['nombre_almacen'], $f['stock']], $resultado['datos']);
            Respuesta::csv("$tipo.csv", ['ID Colección', 'Descripción', 'Ítem', 'Tipo', 'Medidas', 'Almacén', 'Stock'], $filas);
        }

        Respuesta::json($resultado + ['pagina' => Peticion::pagina(), 'por_pagina' => REGISTROS_POR_PAGINA]);
        break;

    case 'movimientos_periodo':
        $desde = $_GET['fecha_desde'] ?? date('Y-m-d', strtotime('-30 days'));
        $hasta = $_GET['fecha_hasta'] ?? date('Y-m-d');

        $entradas = Item::listarEntradas(
            ['fecha_ingreso_desde' => $desde, 'fecha_ingreso_hasta' => $hasta],
            Peticion::pagina(),
            REGISTROS_POR_PAGINA,
            $almacenesPermitidos
        );
        $salidas = Item::listarSalidas(
            ['fecha_salida_desde' => $desde, 'fecha_salida_hasta' => $hasta],
            Peticion::pagina(),
            REGISTROS_POR_PAGINA,
            $almacenesPermitidos
        );

        if (($_GET['export'] ?? '') === 'csv') {
            $filas = [];
            foreach ($entradas['datos'] as $f) {
                $filas[] = ['Ingreso', $f['fecha_ingreso'], $f['numero_serie'], $f['coleccion_descripcion'], $f['almacen_nombre']];
            }
            foreach ($salidas['datos'] as $f) {
                $filas[] = ['Salida', $f['fecha_salida'], $f['numero_serie'], $f['coleccion_descripcion'], $f['almacen_nombre']];
            }
            Respuesta::csv('movimientos_periodo.csv', ['Tipo', 'Fecha', 'Número de Serie', 'Colección', 'Almacén'], $filas);
        }

        Respuesta::json([
            'entradas' => $entradas, 'salidas' => $salidas,
            'pagina' => Peticion::pagina(), 'por_pagina' => REGISTROS_POR_PAGINA,
        ]);
        break;

    case 'items_mas_salidas':
        $periodo = in_array($_GET['periodo'] ?? 'mes', ['semana', 'mes', 'anio'], true) ? $_GET['periodo'] : 'mes';
        $desde = match ($periodo) {
            'semana' => date('Y-m-d', strtotime('-7 days')),
            'anio' => date('Y-m-d', strtotime('-1 year')),
            default => date('Y-m-d', strtotime('-1 month')),
        };

        $datos = Item::topItemsPorSalidas($almacenesPermitidos, $desde, 20);

        if (($_GET['export'] ?? '') === 'csv') {
            $filas = array_map(static fn ($f) => [$f['descripcion'], $f['item'], $f['tipo'], $f['medidas'], $f['total_salidas']], $datos);
            Respuesta::csv('items_mas_salidas.csv', ['Descripción', 'Ítem', 'Tipo', 'Medidas', 'Total de Salidas'], $filas);
        }

        Respuesta::json(['datos' => $datos, 'total' => count($datos), 'periodo' => $periodo]);
        break;

    case 'auditoria':
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
            $filas = array_map(static fn ($f) => [$f['fecha_operacion'], $f['tipo_operacion'], $f['usuario_nombre'], $f['numero_serie'], $f['coleccion_descripcion'], $f['detalle']], $resultado['datos']);
            Respuesta::csv('auditoria.csv', ['Fecha', 'Tipo de Operación', 'Usuario', 'Número de Serie', 'Colección', 'Detalle'], $filas);
        }

        Respuesta::json($resultado + ['pagina' => Peticion::pagina(), 'por_pagina' => REGISTROS_POR_PAGINA]);
        break;

    default:
        Respuesta::error('Tipo de reporte no reconocido.', 422);
}
