/** Helpers pequeños compartidos por las vistas (escape HTML, formato de fecha). */
export function escaparHtml(valor) {
    if (valor === null || valor === undefined) return '';
    return String(valor)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

export function formatearFecha(valor) {
    if (!valor) return '—';
    return String(valor).replace('T', ' ').slice(0, 16);
}

export function formatearFechaCorta(valor) {
    if (!valor) return '—';
    return String(valor).slice(0, 10);
}
