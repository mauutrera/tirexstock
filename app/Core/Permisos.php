<?php

namespace App\Core;

/**
 * Matriz central de roles y permisos (secciones 3.1, 3.2, 4.2 y 4.3 de la
 * especificación funcional). Única fuente de verdad: la consultan tanto los
 * Controllers (para servir o no una vista) como cada endpoint de app/Api.
 */
class Permisos
{
    private const ROLES_ADMIN = ['super_admin', 'admin_general', 'admin_almacen'];

    /** Vistas de acceso exclusivo para administradores (no configurables). */
    private const VISTAS_SOLO_ADMIN = ['dashboard', 'reportes', 'colecciones', 'almacenes', 'usuarios'];

    /** Vistas operativas configurables por usuario normal, con su valor por defecto. */
    private const VISTAS_CONFIGURABLES = [
        'entradas' => true,
        'salidas' => true,
        'inventario' => true,
        'historial' => false,
    ];

    /** Acciones configurables por usuario normal (todas false por defecto). */
    private const ACCIONES_CONFIGURABLES = [
        'agregar_entrada',
        'eliminar_entrada',
        'marcar_salida',
        'desmarcar_salida',
    ];

    /** Vistas de cuenta propia: accesibles para cualquier usuario autenticado, sin importar rol o permisos. */
    private const VISTAS_SIEMPRE_ACCESIBLES = ['perfil'];

    public static function esAdmin(array $usuario): bool
    {
        return in_array($usuario['rol'], self::ROLES_ADMIN, true);
    }

    public static function esSuperAdmin(array $usuario): bool
    {
        return $usuario['rol'] === 'super_admin';
    }

    public static function puedeVerVista(array $usuario, string $vista): bool
    {
        if (in_array($vista, self::VISTAS_SIEMPRE_ACCESIBLES, true)) {
            return true;
        }

        if (in_array($vista, self::VISTAS_SOLO_ADMIN, true)) {
            return self::esAdmin($usuario);
        }

        if (!array_key_exists($vista, self::VISTAS_CONFIGURABLES)) {
            return false;
        }

        if (self::esAdmin($usuario)) {
            return true;
        }

        $permisos = $usuario['permisos'] ?? [];
        $clave = 'vista_' . $vista;

        return array_key_exists($clave, $permisos)
            ? (bool) $permisos[$clave]
            : self::VISTAS_CONFIGURABLES[$vista];
    }

    public static function puedeRealizarAccion(array $usuario, string $accion): bool
    {
        if (self::esAdmin($usuario)) {
            return true;
        }

        if (!in_array($accion, self::ACCIONES_CONFIGURABLES, true)) {
            return false;
        }

        $permisos = $usuario['permisos'] ?? [];
        $clave = 'accion_' . $accion;

        return !empty($permisos[$clave]);
    }

    /**
     * Editar (no crear ni eliminar) entradas/salidas es exclusivo de
     * administradores: no existe una clave configurable para ello.
     */
    public static function puedeEditarRegistros(array $usuario): bool
    {
        return self::esAdmin($usuario);
    }

    /**
     * IDs de almacén visibles para el usuario. Devuelve null cuando el
     * usuario tiene visibilidad total (admin_general / super_admin).
     */
    public static function almacenesPermitidos(array $usuario): ?array
    {
        if (in_array($usuario['rol'], ['super_admin', 'admin_general'], true)) {
            return null;
        }

        return array_map(
            static fn (array $almacen) => (int) $almacen['id_almacen'],
            $usuario['almacenes'] ?? []
        );
    }

    public static function tieneAccesoAlmacen(array $usuario, int $idAlmacen): bool
    {
        $permitidos = self::almacenesPermitidos($usuario);

        return $permitidos === null || in_array($idAlmacen, $permitidos, true);
    }

    /**
     * admin_general y super_admin administran usuarios/almacenes de forma
     * global; admin_almacen solo dentro de sus almacenes asignados.
     */
    public static function puedeAdministrarUsuarios(array $usuario): bool
    {
        return self::esAdmin($usuario);
    }
}
