import { escaparHtml } from '../core/Utilidades.js';

/** Notificaciones: alertas de colecciones con stock en o bajo su umbral (solo administradores). */
export default class NotificacionesView {
    constructor({ api, contenedor }) {
        this.api = api;
        this.contenedor = contenedor;
    }

    async render() {
        this.contenedor.innerHTML = `<p class="text-texto-secundario">Cargando notificaciones…</p>`;

        let datos;
        try {
            datos = await this.api.get('/api/notificaciones');
        } catch (error) {
            this.contenedor.innerHTML = `<p class="text-red-600">${escaparHtml(error.message || 'No se pudieron cargar las notificaciones.')}</p>`;
            return;
        }

        const alertas = datos.alertas_stock_bajo || [];
        const sinStock = alertas.filter((a) => Number(a.stock) === 0).length;

        this.contenedor.innerHTML = `
            <h1 class="text-2xl font-semibold mb-1">Notificaciones</h1>
            <p class="text-sm text-texto-secundario mb-4">${this._resumen(alertas.length, sinStock)}</p>
            <div data-alertas class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"></div>
        `;

        this._pintarAlertas(alertas);
    }

    _resumen(total, sinStock) {
        if (!total) return 'No hay notificaciones pendientes.';
        const partes = [`${total} colección(es) en o bajo el umbral de stock`];
        if (sinStock) partes.push(`${sinStock} sin stock`);
        return partes.join(' · ');
    }

    _pintarAlertas(alertas) {
        const contenedor = this.contenedor.querySelector('[data-alertas]');
        if (!alertas.length) {
            contenedor.innerHTML = `<div class="tarjeta p-4 text-sm text-texto-secundario">Sin alertas de stock bajo. 👍</div>`;
            return;
        }
        contenedor.innerHTML = alertas
            .map((a) => {
                const critico = Number(a.stock) === 0;
                return `
                    <div class="rounded-xl border ${critico ? 'border-red-300' : 'border-amber-300'} bg-superficie p-4">
                        <p class="text-xs font-medium ${critico ? 'text-red-600' : 'text-amber-600'} uppercase tracking-wide">${critico ? 'Sin stock' : 'Stock bajo'}</p>
                        <p class="text-sm font-medium mt-1">${escaparHtml(a.descripcion)}</p>
                        <p class="text-xs text-texto-secundario mt-1">${escaparHtml(a.nombre_almacen)} · Stock: ${a.stock} / Umbral: ${a.umbral_stock_bajo}</p>
                        <a href="/inventario/coleccion/${Number(a.id_coleccion)}" data-link class="inline-block mt-3 text-xs font-medium text-acento-texto hover:underline">Ver colección &rarr;</a>
                    </div>
                `;
            })
            .join('');
    }
}
