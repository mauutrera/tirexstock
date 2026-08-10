/**
 * Espejo, solo para UI (mostrar/ocultar botones), de la matriz de permisos
 * del backend (app/Core/Permisos.php). La autoridad real sigue siendo el
 * servidor: cada endpoint vuelve a validar todo esto.
 */
const ROLES_ADMIN = ['super_admin', 'admin_general', 'admin_almacen'];

export function esAdmin(usuario) {
    return ROLES_ADMIN.includes(usuario?.rol);
}

export function puedeEditarRegistros(usuario) {
    return esAdmin(usuario);
}

export function puedeAccion(usuario, clave) {
    if (esAdmin(usuario)) return true;
    return Boolean(usuario?.permisos?.[`accion_${clave}`]);
}
