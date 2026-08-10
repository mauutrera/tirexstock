import DataTable from '../components/DataTable.js';
import { escaparHtml, formatearFecha } from '../core/Utilidades.js';

const ETIQUETAS_OPERACION = {
    ingreso: 'Ingreso',
    salida: 'Salida',
    desmarque_salida: 'Desmarque de Salida',
    edicion: 'Edición',
    eliminacion: 'Eliminación',
};

/** Vista de Historial (5.6): log de auditoría completo. */
export default class HistorialView {
    constructor({ api, contenedor }) {
        this.api = api;
        this.contenedor = contenedor;
    }

    async render() {
        this.contenedor.innerHTML = `
            <h1 class="text-2xl font-semibold mb-4">Historial</h1>
            <div data-tabla></div>
        `;

        this.tabla = new DataTable({
            contenedor: this.contenedor.querySelector('[data-tabla]'),
            columnas: [
                { clave: 'fecha_operacion', etiqueta: 'Fecha de Operación', formato: (v) => escaparHtml(formatearFecha(v)), filtro: { tipo: 'rango_fecha', clave: 'fecha' } },
                {
                    clave: 'tipo_operacion',
                    etiqueta: 'Tipo de Operación',
                    formato: (v) => escaparHtml(ETIQUETAS_OPERACION[v] || v),
                    filtro: {
                        tipo: 'seleccion',
                        opciones: Object.entries(ETIQUETAS_OPERACION).map(([valor, etiqueta]) => ({ valor, etiqueta })),
                    },
                },
                { clave: 'usuario_nombre', etiqueta: 'Usuario' },
                { clave: 'numero_serie', etiqueta: 'Número de Serie', filtro: { tipo: 'texto' } },
                { clave: 'coleccion_descripcion', etiqueta: 'Colección' },
                { clave: 'detalle', etiqueta: 'Detalle' },
            ],
            cargarPagina: (pagina, filtros) => this.api.get(this._url(pagina, filtros)),
            exportar: (filtros) => this.api.descargar(this._url(1, filtros, true), 'historial.csv'),
            filaVacia: 'Sin movimientos registrados.',
        });
    }

    _url(pagina, filtros, exportar = false) {
        const params = new URLSearchParams({ page: pagina, ...filtros });
        if (exportar) params.set('export', 'csv');
        return `/api/historial?${params.toString()}`;
    }
}
