import DataTable from '../components/DataTable.js';
import { escaparHtml, formatearFecha } from '../core/Utilidades.js';

/** Vista de Detalle de Colección (5.5). */
export default class DetalleColeccionView {
    constructor({ api, toast, contenedor, params }) {
        this.api = api;
        this.toast = toast;
        this.contenedor = contenedor;
        this.idColeccion = params.id;
        this.estado = 'todas';
    }

    async render() {
        this.contenedor.innerHTML = `
            <a href="/inventario" data-link class="text-sm text-acento-texto hover:underline">&larr; Volver a Inventario</a>
            <div class="flex items-center justify-between mt-2 mb-4 gap-3 flex-wrap">
                <div>
                    <h1 class="text-2xl font-semibold" data-titulo>Colección</h1>
                    <p class="text-sm text-texto-secundario" data-subtitulo></p>
                </div>
                <label class="text-sm">
                    <select data-estado class="rounded-lg border border-borde bg-fondo px-3 py-2 text-sm">
                        <option value="todas">Mostrar Todas</option>
                        <option value="sin_salida">Solo sin Salida (en stock)</option>
                        <option value="con_salida">Solo con Salida</option>
                    </select>
                </label>
            </div>
            <div data-tabla></div>
        `;

        this.contenedor.querySelector('[data-estado]').addEventListener('change', (evento) => {
            this.estado = evento.target.value;
            this.tabla.paginaActual = 1;
            this.tabla.cargar();
        });

        this.tabla = new DataTable({
            contenedor: this.contenedor.querySelector('[data-tabla]'),
            columnas: [
                { clave: 'numero_serie', etiqueta: 'Número de Serie', filtro: { tipo: 'texto' } },
                { clave: 'fecha_ingreso', etiqueta: 'Fecha de Ingreso', formato: (v) => escaparHtml(formatearFecha(v)) },
                { clave: 'usuario_registra_nombre', etiqueta: 'Usuario que Registra' },
                { clave: 'fecha_salida', etiqueta: 'Fecha de Salida', formato: (v) => escaparHtml(formatearFecha(v)) },
                { clave: 'usuario_retira_nombre', etiqueta: 'Usuario que Retira' },
                { clave: 'responsable_recibe', etiqueta: 'Responsable que Recibe' },
                { clave: 'notas_entrada', etiqueta: 'Notas de Entrada', filtro: { tipo: 'texto' } },
                { clave: 'notas_salida', etiqueta: 'Notas de Salida', filtro: { tipo: 'texto', clave: 'notas_salida' } },
            ],
            cargarPagina: async (pagina, filtros) => {
                const resultado = await this.api.get(this._url(pagina, filtros));
                this._pintarEncabezado(resultado.coleccion);
                return resultado;
            },
            exportar: (filtros) => this.api.descargar(this._url(1, filtros, true), 'detalle_coleccion.csv'),
            filaVacia: 'No hay ítems para este filtro.',
        });
    }

    _pintarEncabezado(coleccion) {
        if (!coleccion) return;
        this.contenedor.querySelector('[data-titulo]').textContent = coleccion.descripcion;
        this.contenedor.querySelector('[data-subtitulo]').textContent =
            `${coleccion.item} · ${coleccion.tipo} · ${coleccion.medidas} · ${coleccion.nombre_almacen} · Stock: ${coleccion.stock}`;
    }

    _url(pagina, filtros, exportar = false) {
        const params = new URLSearchParams({ page: pagina, coleccion: this.idColeccion, estado: this.estado, ...filtros });
        if (exportar) params.set('export', 'csv');
        return `/api/inventario?${params.toString()}`;
    }
}
