<?php

use App\Core\Auth;
use App\Core\Permisos;
use App\Core\Respuesta;
use App\Models\Coleccion;

$usuario = Auth::requerirSesionApi();

if (!Permisos::puedeVerVista($usuario, 'notificaciones')) {
    Respuesta::error('No tiene permiso para ver las notificaciones.', 403);
}
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Respuesta::error('Método no soportado.', 405);
}

Respuesta::json([
    'alertas_stock_bajo' => Coleccion::conStockBajo(Permisos::almacenesPermitidos($usuario)),
]);
