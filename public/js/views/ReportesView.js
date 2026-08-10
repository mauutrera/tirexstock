import DataTable from '../components/DataTable.js';
import { escaparHtml, formatearFecha } from '../core/Utilidades.js';

const TIPOS = [
    { valor: 'stock_coleccion_almacen', etiqueta: 'Stock por Colección y Almacén' },
    { valor: 'movimientos_periodo', etiqueta: 'Movimientos por Período' },
    { valor: 'items_mas_salidas', etiqueta: 'Ítems con Más Salidas' },
    { valor: 'auditoria', etiqueta: 'Auditoría (cambios y eliminaciones)' },
    { valor: 'maestro_comparativo', etiqueta: 'Reporte Maestro: comparativa entre almacenes' },
];

const ETIQUETAS_OPERACION = {
    ingreso: 'Ingreso', salida: 'Salida', desmarque_salida: 'Desmarque de Salida', edicion: 'Edición', eliminacion: 'Eliminación',
};

/** Reportes (5.8): exclusivo de administradores. */
export default class ReportesView {
    constructor({ api, contenedor }) {
        this.api = api;
        this.contenedor = contenedor;
        this.tipo = 'stock_coleccion_almacen';
    }

    async render() {
        this.contenedor.innerHTML = `
            <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h1 class="text-2xl font-semibold">Reportes</h1>
                <select data-tipo class="rounded-lg border border-borde bg-fondo px-3 py-2 text-sm">
                    ${TIPOS.map((t) => `<option value="${t.valor}">${t.etiqueta}</option>`).join('')}
                </select>
            </div>
            <div data-panel></div>
        `;

        this.contenedor.querySelector('[data-tipo]').addEventListener('change', (evento) => {
            this.tipo = evento.target.value;
            this._montarPanel();
        });

        this._montarPanel();
    }

    _montarPanel() {
        const panel = this.contenedor.querySelector('[data-panel]');
        panel.innerHTML = '';

        if (this.tipo === 'movimientos_periodo') {
            panel.innerHTML = `
                <h2 class="text-sm font-semibold mb-2">Entradas del período</h2>
                <div data-tabla-entradas class="mb-6"></div>
                <h2 class="text-sm font-semibold mb-2">Salidas del período</h2>
                <div data-tabla-salidas></div>
            `;
            this._tablaEntradasPeriodo(panel.querySelector('[data-tabla-entradas]'));
            this._tablaSalidasPeriodo(panel.querySelector('[data-tabla-salidas]'));
            return;
        }

        panel.innerHTML = '<div data-tabla></div>';
        const contenedorTabla = panel.querySelector('[data-tabla]');

        if (this.tipo === 'stock_coleccion_almacen' || this.tipo === 'maestro_comparativo') {
            this._tablaStock(contenedorTabla);
        } else if (this.tipo === 'items_mas_salidas') {
            this._tablaTopItems(contenedorTabla);
        } else if (this.tipo === 'auditoria') {
            this._tablaAuditoria(contenedorTabla);
        }
    }

    _url(pagina, filtros, exportar = false) {
        const params = new URLSearchParams({ tipo: this.tipo, page: pagina, ...filtros });
        if (exportar) params.set('export', 'csv');
        return `/api/reportes?${params.toString()}`;
    }

    _tablaStock(contenedor) {
        new DataTable({
            contenedor,
            columnas: [
                { clave: 'descripcion', etiqueta: 'Descripción', filtro: { tipo: 'texto' } },
                { clave: 'item', etiqueta: 'Ítem' },
                { clave: 'tipo', etiqueta: 'Tipo' },
                { clave: 'medidas', etiqueta: 'Medidas' },
                { clave: 'nombre_almacen', etiqueta: 'Almacén' },
                { clave: 'stock', etiqueta: 'Stock' },
            ],
            cargarPagina: (pagina, filtros) => this.api.get(this._url(pagina, filtros)),
            exportar: (filtros) => this.api.descargar(this._url(1, filtros, true), `${this.tipo}.csv`),
        });
    }

    _tablaEntradasPeriodo(contenedor) {
        new DataTable({
            contenedor,
            columnas: [
                { clave: 'fecha_ingreso', etiqueta: 'Fecha', formato: (v) => escaparHtml(formatearFecha(v)), filtro: { tipo: 'rango_fecha', clave: 'fecha' } },
                { clave: 'numero_serie', etiqueta: 'Número de Serie' },
                { clave: 'coleccion_descripcion', etiqueta: 'Colección' },
                { clave: 'almacen_nombre', etiqueta: 'Almacén' },
            ],
            cargarPagina: async (pagina, filtros) => (await this.api.get(this._url(pagina, filtros))).entradas,
            exportar: (filtros) => this.api.descargar(this._url(1, filtros, true), 'movimientos_periodo.csv'),
        });
    }

    _tablaSalidasPeriodo(contenedor) {
        new DataTable({
            contenedor,
            columnas: [
                { clave: 'fecha_salida', etiqueta: 'Fecha', formato: (v) => escaparHtml(formatearFecha(v)) },
                { clave: 'numero_serie', etiqueta: 'Número de Serie' },
                { clave: 'coleccion_descripcion', etiqueta: 'Colección' },
                { clave: 'almacen_nombre', etiqueta: 'Almacén' },
            ],
            cargarPagina: async (pagina, filtros) => (await this.api.get(this._url(pagina, filtros))).salidas,
            exportar: () => {},
        });
    }

    _tablaTopItems(contenedor) {
        new DataTable({
            contenedor,
            columnas: [
                { clave: 'descripcion', etiqueta: 'Descripción' },
                { clave: 'item', etiqueta: 'Ítem' },
                { clave: 'tipo', etiqueta: 'Tipo' },
                { clave: 'medidas', etiqueta: 'Medidas' },
                { clave: 'total_salidas', etiqueta: 'Total de Salidas' },
            ],
            cargarPagina: async (pagina, filtros) => {
                const resultado = await this.api.get(this._url(pagina, filtros));
                return { datos: resultado.datos, total: resultado.total, pagina: 1, por_pagina: resultado.total || 1 };
            },
            exportar: (filtros) => this.api.descargar(this._url(1, filtros, true), 'items_mas_salidas.csv'),
        });
    }

    _tablaAuditoria(contenedor) {
        new DataTable({
            contenedor,
            columnas: [
                { clave: 'fecha_operacion', etiqueta: 'Fecha', formato: (v) => escaparHtml(formatearFecha(v)), filtro: { tipo: 'rango_fecha', clave: 'fecha' } },
                {
                    clave: 'tipo_operacion', etiqueta: 'Tipo', formato: (v) => escaparHtml(ETIQUETAS_OPERACION[v] || v),
                    filtro: { tipo: 'seleccion', opciones: Object.entries(ETIQUETAS_OPERACION).map(([valor, etiqueta]) => ({ valor, etiqueta })) },
                },
                { clave: 'usuario_nombre', etiqueta: 'Usuario' },
                { clave: 'numero_serie', etiqueta: 'Número de Serie', filtro: { tipo: 'texto' } },
                { clave: 'coleccion_descripcion', etiqueta: 'Colección' },
                { clave: 'detalle', etiqueta: 'Detalle' },
            ],
            cargarPagina: (pagina, filtros) => this.api.get(this._url(pagina, filtros)),
            exportar: (filtros) => this.api.descargar(this._url(1, filtros, true), 'auditoria.csv'),
        });
    }
}
