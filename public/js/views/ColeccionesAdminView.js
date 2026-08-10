import DataTable from '../components/DataTable.js';
import Modal from '../components/Modal.js';
import { escaparHtml } from '../core/Utilidades.js';

/** Administración de Colecciones (5.9). */
export default class ColeccionesAdminView {
    constructor({ api, toast, contenedor }) {
        this.api = api;
        this.toast = toast;
        this.contenedor = contenedor;
    }

    async render() {
        this.almacenes = (await this.api.get('/api/almacenes')).datos || [];

        this.contenedor.innerHTML = `
            <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h1 class="text-2xl font-semibold">Administración de Colecciones</h1>
                <button type="button" data-agregar class="rounded-lg bg-acento px-4 py-2 text-sm font-medium text-white hover:opacity-90">Agregar Nueva Colección</button>
            </div>
            <div data-tabla></div>
        `;
        this.contenedor.querySelector('[data-agregar]').addEventListener('click', () => this._abrirFormulario());

        this.tabla = new DataTable({
            contenedor: this.contenedor.querySelector('[data-tabla]'),
            columnas: [
                { clave: 'id_coleccion', etiqueta: 'ID Colección' },
                { clave: 'descripcion', etiqueta: 'Descripción', filtro: { tipo: 'texto' } },
                { clave: 'item', etiqueta: 'Ítem', filtro: { tipo: 'texto' } },
                { clave: 'tipo', etiqueta: 'Tipo', filtro: { tipo: 'texto' } },
                { clave: 'medidas', etiqueta: 'Medidas', filtro: { tipo: 'texto' } },
                {
                    clave: 'nombre_almacen', etiqueta: 'Almacén',
                    filtro: { tipo: 'seleccion', clave: 'id_almacen', opciones: this.almacenes.map((a) => ({ valor: a.id_almacen, etiqueta: a.nombre })) },
                },
            ],
            acciones: [
                { etiqueta: 'Editar', onClick: (fila) => this._abrirFormulario(fila) },
                { etiqueta: 'Eliminar', claseCss: 'text-red-600 hover:bg-red-50', onClick: (fila) => this._eliminar(fila) },
            ],
            cargarPagina: (pagina, filtros) => this.api.get(this._url(pagina, filtros)),
            exportar: (filtros) => this.api.descargar(this._url(1, filtros, true), 'colecciones.csv'),
            filaVacia: 'No hay colecciones registradas.',
        });
    }

    _url(pagina, filtros, exportar = false) {
        const params = new URLSearchParams({ page: pagina, ...filtros });
        if (exportar) params.set('export', 'csv');
        return `/api/colecciones?${params.toString()}`;
    }

    _abrirFormulario(coleccion = null) {
        const opcionesAlmacen = this.almacenes
            .map((a) => `<option value="${a.id_almacen}" ${coleccion?.id_almacen === a.id_almacen ? 'selected' : ''}>${escaparHtml(a.nombre)}</option>`)
            .join('');

        const modal = new Modal({
            titulo: coleccion ? 'Editar Colección' : 'Agregar Nueva Colección',
            contenidoHtml: `
                <form data-form class="space-y-4">
                    <label class="block text-sm">Descripción
                        <input type="text" name="descripcion" required value="${escaparHtml(coleccion?.descripcion || '')}" class="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm">
                    </label>
                    <div class="grid grid-cols-2 gap-3">
                        <label class="block text-sm">Ítem
                            <input type="text" name="item" required value="${escaparHtml(coleccion?.item || '')}" class="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm">
                        </label>
                        <label class="block text-sm">Tipo
                            <input type="text" name="tipo" required value="${escaparHtml(coleccion?.tipo || '')}" class="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm">
                        </label>
                    </div>
                    <label class="block text-sm">Medidas
                        <input type="text" name="medidas" required value="${escaparHtml(coleccion?.medidas || '')}" class="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm">
                    </label>
                    <div class="grid grid-cols-2 gap-3">
                        <label class="block text-sm">Almacén
                            <select name="id_almacen" required class="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm">
                                <option value="">Seleccione…</option>
                                ${opcionesAlmacen}
                            </select>
                        </label>
                        <label class="block text-sm">Umbral de Stock Bajo
                            <input type="number" name="umbral_stock_bajo" min="0" value="${coleccion?.umbral_stock_bajo ?? 2}" class="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm">
                        </label>
                    </div>
                    <div class="flex justify-end gap-2 pt-2">
                        <button type="button" data-cerrar-modal class="rounded-lg border border-borde px-3 py-2 text-sm font-medium hover:bg-fondo">Cancelar</button>
                        <button type="submit" class="rounded-lg bg-acento px-3 py-2 text-sm font-medium text-white hover:opacity-90">Guardar</button>
                    </div>
                </form>
            `,
            onMontar: (overlay) => {
                overlay.querySelector('[data-form]').addEventListener('submit', async (evento) => {
                    evento.preventDefault();
                    const datos = Object.fromEntries(new FormData(evento.target).entries());
                    try {
                        if (coleccion) {
                            await this.api.put('/api/colecciones', { ...datos, id_coleccion: coleccion.id_coleccion });
                        } else {
                            await this.api.post('/api/colecciones', datos);
                        }
                        this.toast.exito('Colección guardada.');
                        modal.cerrar();
                        this.tabla.cargar();
                    } catch (error) {
                        this.toast.error(error.message || 'No se pudo guardar la colección.');
                    }
                });
            },
        });
        modal.abrir();
    }

    async _eliminar(fila) {
        const confirmado = await Modal.confirmar({
            titulo: 'Eliminar colección',
            mensaje: `¿Eliminar "${fila.descripcion}"? Esta acción no se puede deshacer.`,
            textoConfirmar: 'Eliminar',
        });
        if (!confirmado) return;

        try {
            await this.api.eliminar(`/api/colecciones?id_coleccion=${fila.id_coleccion}`);
            this.toast.exito('Colección eliminada.');
            this.tabla.cargar();
        } catch (error) {
            this.toast.error(error.message || 'No se pudo eliminar la colección.');
        }
    }
}
