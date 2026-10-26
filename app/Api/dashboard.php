<?php

use App\Core\Auth;
use App\Core\Permisos;
use App\Core\Respuesta;
use App\Models\Almacen;
use App\Models\Coleccion;
use App\Models\Dashboard;

$usuario = Auth::requerirSesionApi();

if (!Permisos::puedeVerVista($usuario, 'dashboard')) {
    Respuesta::error('No tiene permiso para ver el dashboard.', 403);
}
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Respuesta::error('Método no soportado.', 405);
}

$almacenesPermitidos = Permisos::almacenesPermitidos($usuario);

// Filtros globales: una sola fila de filtros en la vista recorta TODO el dashboard.
$idAlmacen = isset($_GET['almacen']) && $_GET['almacen'] !== '' ? (int) $_GET['almacen'] : null;
if ($idAlmacen !== null && !Permisos::tieneAccesoAlmacen($usuario, $idAlmacen)) {
    Respuesta::error('Almacén no encontrado.', 404);
}

$filtros = ['id_almacen' => $idAlmacen];
if (($_GET['item'] ?? '') !== '' && ($_GET['tipo'] ?? '') !== '' && ($_GET['medidas'] ?? '') !== '') {
    $filtros += ['item' => $_GET['item'], 'tipo' => $_GET['tipo'], 'medidas' => $_GET['medidas']];
}

$dias = in_array((int) ($_GET['dias'] ?? 30), [7, 30, 90, 365], true) ? (int) ($_GET['dias'] ?? 30) : 30;

// El periodo incluye el día de hoy: [hoy - (dias - 1), mañana).
$hoy = strtotime(date('Y-m-d'));
$desde = strtotime('-' . ($dias - 1) . ' days', $hoy);
$hasta = strtotime('+1 day', $hoy);
$desdeAnterior = strtotime("-$dias days", $desde);
$fecha = static fn (int $ts) => date('Y-m-d H:i:s', $ts);

$dashboard = new Dashboard($almacenesPermitidos, $filtros);

// Serie de entradas vs salidas: diaria, o semanal (lunes) para el periodo de 12 meses.
$porSemana = $dias > 90;
$entradasDia = $dashboard->movimientosPorDia('fecha_ingreso', $fecha($desde));
$salidasDia = $dashboard->movimientosPorDia('fecha_salida', $fecha($desde));
$serie = [];
for ($ts = $desde; $ts < $hasta; $ts = strtotime('+1 day', $ts)) {
    $dia = date('Y-m-d', $ts);
    $clave = $porSemana ? date('Y-m-d', strtotime('monday this week', $ts)) : $dia;
    $serie[$clave] ??= ['fecha' => $clave, 'entradas' => 0, 'salidas' => 0];
    $serie[$clave]['entradas'] += $entradasDia[$dia] ?? 0;
    $serie[$clave]['salidas'] += $salidasDia[$dia] ?? 0;
}

$stockPorColeccion = $dashboard->stockPorColeccion();
$stockTotal = array_sum(array_map(static fn ($c) => (int) $c['stock'], $stockPorColeccion));
$enAlerta = array_filter($stockPorColeccion, static fn ($c) => (int) $c['stock'] <= (int) $c['umbral_stock_bajo']);
$sinStock = array_filter($enAlerta, static fn ($c) => (int) $c['stock'] === 0);

$salidas = $dashboard->contarMovimientos('fecha_salida', $fecha($desde), $fecha($hasta));
$promedioSalidasDia = $salidas / $dias;

Respuesta::json([
    'periodo' => ['dias' => $dias, 'desde' => date('Y-m-d', $desde), 'hasta' => date('Y-m-d', $hoy), 'agrupacion' => $porSemana ? 'semana' : 'dia'],
    'kpis' => [
        'stock_total' => $stockTotal,
        'colecciones' => count($stockPorColeccion),
        'colecciones_en_alerta' => count($enAlerta),
        'colecciones_sin_stock' => count($sinStock),
        'entradas' => $dashboard->contarMovimientos('fecha_ingreso', $fecha($desde), $fecha($hasta)),
        'entradas_anterior' => $dashboard->contarMovimientos('fecha_ingreso', $fecha($desdeAnterior), $fecha($desde)),
        'salidas' => $salidas,
        'salidas_anterior' => $dashboard->contarMovimientos('fecha_salida', $fecha($desdeAnterior), $fecha($desde)),
        'salidas_promedio_dia' => round($promedioSalidasDia, 2),
        'cobertura_dias' => $promedioSalidasDia > 0 ? (int) floor($stockTotal / $promedioSalidasDia) : null,
    ],
    'serie_movimientos' => array_values($serie),
    'stock_por_coleccion' => $stockPorColeccion,
    'stock_por_almacen' => $dashboard->stockPorAlmacen(),
    'movimientos_por_almacen' => $dashboard->movimientosPorAlmacen($fecha($desde)),
    'top_salidas' => $dashboard->topSalidas($fecha($desde)),
    'actividad_usuarios' => $dashboard->actividadPorUsuario($fecha($desde)),
    'actividad_reciente' => $dashboard->actividadReciente(),
    'almacenes_disponibles' => Almacen::listar($almacenesPermitidos),
    'conjuntos_disponibles' => Coleccion::listarConjuntos($almacenesPermitidos),
]);
