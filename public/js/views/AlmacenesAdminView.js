import DataTable from '../components/DataTable.js';
import Modal from '../components/Modal.js';
import { escaparHtml } from '../core/Utilidades.js';

/** Administración de Almacenes (5.10). */
export default class AlmacenesAdminView {
    constructor({ api, usuario, toast, contenedor }) {
        this.api = api;
        this.usuario = usuario;
        this.toast = toast;
        this.contenedor = contenedor;
        this.esGerenciaGlobal = ['super_admin', 'admin_general'].includes(usuario.rol);
    }

    async render() {
        this.contenedor.innerHTML = `
            <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h1 class="text-2xl font-semibold">Administración de Almacenes</h1>
                ${this.esGerenciaGlobal ? '<button type="button" data-agregar class="rounded-lg bg-acento px-4 py-2 text-sm font-medium text-white hover:opacity-90">Agregar Nuevo Almacén</button>' : ''}
            </div>
            <div data-tabla></div>
        `;
        this.contenedor.querySelector('[data-agregar]')?.addEventListener('click', () => this._abrirFormulario());

        const acciones = [{ etiqueta: 'Editar', onClick: (fila) => this._abrirFormulario(fila) }];
        if (this.esGerenciaGlobal) {
            acciones.push({ etiqueta: 'Eliminar', claseCss: 'text-red-600 hover:bg-red-50', onClick: (fila) => this._eliminar(fila) });
        }

        this.tabla = new DataTable({
            contenedor: this.contenedor.querySelector('[data-tabla]'),
            columnas: [
                { clave: 'nombre', etiqueta: 'Nombre', filtro: { tipo: 'texto' } },
                { clave: 'ubicacion', etiqueta: 'Ubicación', filtro: { tipo: 'texto' } },
            ],
            acciones,
            cargarPagina: (pagina, filtros) => this.api.get(this._url(pagina, filtros)),
            exportar: (filtros) => this.api.descargar(this._url(1, filtros, true), 'almacenes.csv'),
            filaVacia: 'No hay almacenes registrados.',
        });
    }

    _url(pagina, filtros, exportar = false) {
        const params = new URLSearchParams({ page: pagina, ...filtros });
        if (exportar) params.set('export', 'csv');
        return `/api/almacenes?${params.toString()}`;
    }

    _abrirFormulario(almacen = null) {
        const modal = new Modal({
            titulo: almacen ? 'Editar Almacén' : 'Agregar Nuevo Almacén',
            ancho: 'max-w-md',
            contenidoHtml: `
                <form data-form class="space-y-4">
                    <label class="block text-sm">Nombre
                        <input type="text" name="nombre" required value="${escaparHtml(almacen?.nombre || '')}" class="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm">
                    </label>
                    <label class="block text-sm">Ubicación
                        <input type="text" name="ubicacion" value="${escaparHtml(almacen?.ubicacion || '')}" class="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm">
                    </label>
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
                        if (almacen) {
                            await this.api.put('/api/almacenes', { ...datos, id_almacen: almacen.id_almacen });
                        } else {
                            await this.api.post('/api/almacenes', datos);
                        }
                        this.toast.exito('Almacén guardado.');
                        modal.cerrar();
                        this.tabla.cargar();
                    } catch (error) {
                        this.toast.error(error.message || 'No se pudo guardar el almacén.');
                    }
                });
            },
        });
        modal.abrir();
    }

    async _eliminar(fila) {
        const confirmado = await Modal.confirmar({
            titulo: 'Eliminar almacén',
            mensaje: `¿Eliminar "${fila.nombre}"? Esta acción no se puede deshacer.`,
            textoConfirmar: 'Eliminar',
        });
        if (!confirmado) return;

        try {
            await this.api.eliminar(`/api/almacenes?id_almacen=${fila.id_almacen}`);
            this.toast.exito('Almacén eliminado.');
            this.tabla.cargar();
        } catch (error) {
            this.toast.error(error.message || 'No se pudo eliminar el almacén.');
        }
    }
}
