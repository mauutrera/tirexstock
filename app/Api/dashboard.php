<?php

use App\Core\Auth;
use App\Core\Permisos;
use App\Core\Respuesta;
use App\Models\Coleccion;
use App\Models\Item;

$usuario = Auth::requerirSesionApi();

if (!Permisos::puedeVerVista($usuario, 'dashboard')) {
    Respuesta::error('No tiene permiso para ver el dashboard.', 403);
}
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Respuesta::error('Método no soportado.', 405);
}

$almacenesPermitidos = Permisos::almacenesPermitidos($usuario);

// Filtro opcional por conjunto artículo/tipo/medida (independiente del almacén), para poder
// comparar entre almacenes. Cada gráfica tiene su propio filtro/parámetros.
$leerConjunto = static function (string $prefijo): ?array {
    $clave = static fn (string $sufijo) => $prefijo === '' ? $sufijo : "{$prefijo}_{$sufijo}";
    if (
        isset($_GET[$clave('item')], $_GET[$clave('tipo')], $_GET[$clave('medidas')])
        && $_GET[$clave('item')] !== '' && $_GET[$clave('tipo')] !== '' && $_GET[$clave('medidas')] !== ''
    ) {
        return [
            'item' => $_GET[$clave('item')],
            'tipo' => $_GET[$clave('tipo')],
            'medidas' => $_GET[$clave('medidas')],
        ];
    }

    return null;
};

$stockPorAlmacen = Coleccion::stockTotalPorAlmacen($almacenesPermitidos, $leerConjunto('stock'));
$salidasPorAlmacen = Item::salidasPorAlmacen($almacenesPermitidos, date('Y-m-d', strtotime('-30 days')), $leerConjunto(''));

Respuesta::json([
    'alertas_stock_bajo' => Coleccion::conStockBajo($almacenesPermitidos),
    'stock_por_almacen' => $stockPorAlmacen,
    'salidas_por_almacen_30d' => $salidasPorAlmacen,
    'conjuntos_disponibles' => Coleccion::listarConjuntos($almacenesPermitidos),
    'top_items_semana' => Item::topItemsPorSalidas($almacenesPermitidos, date('Y-m-d', strtotime('-7 days')), 5),
    'top_items_mes' => Item::topItemsPorSalidas($almacenesPermitidos, date('Y-m-d', strtotime('-1 month')), 5),
    'top_items_anio' => Item::topItemsPorSalidas($almacenesPermitidos, date('Y-m-d', strtotime('-1 year')), 5),
    'movimientos_recientes' => Item::movimientosRecientes(10, $almacenesPermitidos),
]);
