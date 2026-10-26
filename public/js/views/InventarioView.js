import DataTable from '../components/DataTable.js';
import { esAdmin } from '../core/PermisosCliente.js';

function navegarA(ruta) {
    window.history.pushState({}, '', ruta);
    window.dispatchEvent(new PopStateEvent('popstate'));
}

/** Vista de Inventario (5.4). */
export default class InventarioView {
    constructor({ api, usuario, toast, contenedor }) {
        this.api = api;
        this.usuario = usuario;
        this.toast = toast;
        this.contenedor = contenedor;
    }

    async render() {
        this.contenedor.innerHTML = `
            <h1 class="text-2xl font-semibold mb-4">Inventario</h1>
            <div data-tabla></div>
        `;

        const almacenes = await this._obtenerAlmacenes();

        this.tabla = new DataTable({
            contenedor: this.contenedor.querySelector('[data-tabla]'),
            columnas: [
                { clave: 'descripcion', etiqueta: 'Descripción', filtro: { tipo: 'texto' } },
                { clave: 'item', etiqueta: 'Ítem', filtro: { tipo: 'texto' } },
                { clave: 'tipo', etiqueta: 'Tipo', filtro: { tipo: 'texto' } },
                { clave: 'medidas', etiqueta: 'Medidas', filtro: { tipo: 'texto' } },
                {
                    clave: 'nombre_almacen',
                    etiqueta: 'Almacén',
                    filtro: { tipo: 'seleccion', clave: 'id_almacen', opciones: almacenes.map((a) => ({ valor: a.id_almacen, etiqueta: a.nombre })) },
                },
                {
                    clave: 'stock',
                    etiqueta: 'Stock',
                    formato: (valor, fila) => {
                        const bajo = Number(valor) <= Number(fila.umbral_stock_bajo);
                        return `<span class="font-medium ${bajo ? 'text-red-600' : ''}">${valor}</span>${bajo ? ' <span class="text-xs text-red-600">(bajo)</span>' : ''}`;
                    },
                },
            ],
            acciones: [{ etiqueta: 'Ver Colección', onClick: (fila) => navegarA(`/inventario/coleccion/${fila.id_coleccion}`) }],
            cargarPagina: (pagina, filtros) => this.api.get(this._url(pagina, filtros)),
            exportar: (filtros) => this.api.descargar(this._url(1, filtros, true), 'inventario.csv'),
            filaVacia: 'No hay colecciones registradas.',
        });
    }

    async _obtenerAlmacenes() {
        if (this.usuario.almacenes?.length) {
            return this.usuario.almacenes;
        }
        if (esAdmin(this.usuario)) {
            try {
                const resultado = await this.api.get('/api/almacenes');
                return resultado.datos || [];
            } catch {
                return [];
            }
        }
        return [];
    }

    _url(pagina, filtros, exportar = false) {
        const params = new URLSearchParams({ page: pagina, ...filtros });
        if (exportar) params.set('export', 'csv');
        return `/api/inventario?${params.toString()}`;
    }
}
