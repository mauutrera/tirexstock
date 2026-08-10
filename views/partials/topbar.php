<?php
/** @var array $usuario */
$almacenesTexto = implode(', ', array_column($usuario['almacenes'] ?? [], 'nombre')) ?: 'Todos los almacenes';

$etiquetasRol = [
    'super_admin' => 'Super Admin',
    'admin_general' => 'Administrador General',
    'admin_almacen' => 'Administrador por Almacén',
    'usuario_normal' => 'Usuario Normal',
];
$rolTexto = $etiquetasRol[$usuario['rol']] ?? $usuario['rol'];

$partesNombre = preg_split('/\s+/', trim($usuario['nombre']));
$iniciales = strtoupper(mb_substr($partesNombre[0] ?? '', 0, 1) . mb_substr($partesNombre[1] ?? '', 0, 1));
?>
<header class="h-14 shrink-0 border-b border-borde bg-superficie flex items-center justify-between px-3 md:px-5 gap-3">
    <div class="flex items-center gap-2 min-w-0">
        <button id="boton-menu-movil" type="button" class="md:hidden p-2 -ml-2 rounded-lg hover:bg-fondo" aria-label="Abrir menú">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        <span class="font-semibold text-[15px] truncate"><?= APP_NAME ?></span>
    </div>

    <div class="flex items-center gap-2 md:gap-4 min-w-0">
        <span class="hidden sm:block text-xs text-texto-secundario truncate max-w-[220px]" title="<?= htmlspecialchars($almacenesTexto) ?>">
            <?= htmlspecialchars($almacenesTexto) ?>
        </span>

        <button id="boton-tema" type="button" class="p-2 rounded-lg hover:bg-fondo" aria-label="Cambiar tema" title="Cambiar tema claro/oscuro">
            <svg id="icono-tema-claro" class="w-5 h-5 hidden dark:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
            <svg id="icono-tema-oscuro" class="w-5 h-5 dark:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/></svg>
        </button>

        <div class="relative">
            <button id="boton-menu-sesion" type="button" aria-haspopup="true" aria-expanded="false"
                    class="flex items-center gap-2 rounded-lg py-1 pl-1 pr-1.5 sm:pr-2 hover:bg-fondo">
                <span class="w-8 h-8 shrink-0 rounded-full bg-acento text-white flex items-center justify-center text-xs font-semibold">
                    <?= htmlspecialchars($iniciales ?: '?') ?>
                </span>
                <span class="hidden sm:flex flex-col items-start leading-tight">
                    <span class="text-sm font-medium truncate max-w-[140px]"><?= htmlspecialchars($usuario['nombre']) ?></span>
                    <span class="text-xs text-texto-secundario truncate max-w-[140px]"><?= htmlspecialchars($rolTexto) ?></span>
                </span>
                <svg class="w-4 h-4 text-texto-secundario hidden sm:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </button>

            <div id="menu-sesion" class="hidden absolute right-0 top-full mt-2 w-60 rounded-xl border border-borde bg-superficie shadow-lg py-1.5 z-50">
                <div class="px-3.5 py-2.5 border-b border-borde">
                    <p class="text-sm font-medium truncate"><?= htmlspecialchars($usuario['nombre']) ?></p>
                    <p class="text-xs text-texto-secundario truncate"><?= htmlspecialchars($usuario['email']) ?></p>
                    <span class="inline-block mt-1.5 rounded-full bg-fondo border border-borde px-2 py-0.5 text-xs font-medium text-texto-secundario"><?= htmlspecialchars($rolTexto) ?></span>
                </div>
                <a href="/perfil" data-link class="flex items-center gap-2.5 px-3.5 py-2.5 text-sm hover:bg-fondo">
                    <svg class="w-4 h-4 text-texto-secundario" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>
                    Mi Perfil
                </a>
                <div class="border-t border-borde my-1"></div>
                <button id="boton-logout" type="button" class="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-600 hover:bg-fondo">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                    Cerrar Sesión
                </button>
            </div>
        </div>
    </div>
</header>
