<?php
/** @var array $usuario */

use App\Core\Permisos;

$navPrincipal = [
    ['ruta' => 'dashboard', 'vista' => 'dashboard', 'etiqueta' => 'Dashboard', 'icono' => 'grid'],
    ['ruta' => 'notificaciones', 'vista' => 'notificaciones', 'etiqueta' => 'Notificaciones', 'icono' => 'campana'],
    ['ruta' => 'entradas', 'vista' => 'entradas', 'etiqueta' => 'Entradas', 'icono' => 'entrada'],
    ['ruta' => 'salidas', 'vista' => 'salidas', 'etiqueta' => 'Salidas', 'icono' => 'salida'],
    ['ruta' => 'inventario', 'vista' => 'inventario', 'etiqueta' => 'Inventario', 'icono' => 'caja'],
    ['ruta' => 'historial', 'vista' => 'historial', 'etiqueta' => 'Historial', 'icono' => 'reloj'],
    ['ruta' => 'reportes', 'vista' => 'reportes', 'etiqueta' => 'Reportes', 'icono' => 'reporte'],
];

$navAdmin = [
    ['ruta' => 'colecciones', 'vista' => 'colecciones', 'etiqueta' => 'Colecciones', 'icono' => 'etiqueta'],
    ['ruta' => 'almacenes', 'vista' => 'almacenes', 'etiqueta' => 'Almacenes', 'icono' => 'edificio'],
    ['ruta' => 'usuarios', 'vista' => 'usuarios', 'etiqueta' => 'Usuarios', 'icono' => 'usuarios'],
];

$iconos = [
    'campana' => '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    'grid' => '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>',
    'entrada' => '<path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
    'salida' => '<path d="M12 21V9m0 0 4 4m-4-4-4 4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
    'caja' => '<path d="m3.3 7 8.7 5 8.7-5M12 22V12M20 16.5v-9a2 2 0 0 0-1-1.7l-6-3.5a2 2 0 0 0-2 0l-6 3.5a2 2 0 0 0-1 1.7v9a2 2 0 0 0 1 1.7l6 3.5a2 2 0 0 0 2 0l6-3.5a2 2 0 0 0 1-1.7Z"/>',
    'reloj' => '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
    'reporte' => '<path d="M8 17V9M12 17V5M16 17v-4M4 21h16"/>',
    'etiqueta' => '<path d="m20.6 12.6-7.8 7.8a2 2 0 0 1-2.8 0L3.4 13.8a2 2 0 0 1 0-2.8L11.2 3.2a2 2 0 0 1 1.4-.6H19a2 2 0 0 1 2 2v6.6a2 2 0 0 1-.4 1.4Z"/><circle cx="16" cy="8" r="1.5"/>',
    'edificio' => '<path d="M3 21h18M6 21V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v16M9 9h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1"/>',
    'usuarios' => '<path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
];

$esAdmin = Permisos::esAdmin($usuario);
?>
<aside id="sidebar" class="w-64 shrink-0 border-r border-borde bg-superficie hidden md:flex flex-col overflow-y-auto fixed md:sticky top-16 bottom-0 left-0 md:h-[calc(100vh-4rem)] z-20 shadow-flotante md:shadow-none">
    <nav class="p-4 space-y-1 flex-1">
        <p class="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-texto-secundario">Operación</p>
        <?php foreach ($navPrincipal as $item): ?>
            <?php if (!Permisos::puedeVerVista($usuario, $item['vista'])) continue; ?>
            <a href="/<?= $item['ruta'] ?>" data-link data-ruta="<?= $item['ruta'] ?>"
               class="nav-link group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-texto-secundario hover:bg-fondo hover:text-texto">
                <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><?= $iconos[$item['icono']] ?></svg>
                <span><?= htmlspecialchars($item['etiqueta']) ?></span>
                <?php if ($item['ruta'] === 'notificaciones'): ?>
                    <span data-contador-notificaciones class="hidden ml-auto min-w-5 h-5 px-1.5 rounded-full bg-red-600 text-white text-xs font-semibold flex items-center justify-center"></span>
                <?php endif; ?>
            </a>
        <?php endforeach; ?>

        <?php if ($esAdmin): ?>
            <p class="px-3 pt-6 pb-2 text-[11px] font-semibold uppercase tracking-wider text-texto-secundario">Administración</p>
            <?php foreach ($navAdmin as $item): ?>
                <a href="/<?= $item['ruta'] ?>" data-link data-ruta="<?= $item['ruta'] ?>"
                   class="nav-link group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-texto-secundario hover:bg-fondo hover:text-texto">
                    <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><?= $iconos[$item['icono']] ?></svg>
                    <span><?= htmlspecialchars($item['etiqueta']) ?></span>
                </a>
            <?php endforeach; ?>
        <?php endif; ?>
    </nav>
    <div class="p-4 border-t border-borde">
        <div class="rounded-xl bg-fondo px-3 py-3 text-xs text-texto-secundario">
            <p class="font-semibold text-texto">Tirex<span class="text-acento-texto">Stock</span></p>
            <p class="mt-0.5">Inventario de llantas por colecciones</p>
        </div>
    </div>
</aside>
