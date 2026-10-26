import DataTable from '../components/DataTable.js';
import Modal from '../components/Modal.js';
import { escaparHtml, formatearFecha } from '../core/Utilidades.js';
import { puedeAccion, puedeEditarRegistros } from '../core/PermisosCliente.js';

/** Vista de Entradas (5.2). */
export default class EntradasView {
    constructor({ api, usuario, toast, contenedor }) {
        this.api = api;
        this.usuario = usuario;
        this.toast = toast;
        this.contenedor = contenedor;
    }

    async render() {
        try {
            this.almacenes = (await this.api.get('/api/almacenes')).datos || [];
        } catch {
            this.almacenes = [];
        }

        this.contenedor.innerHTML = `
            <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h1 class="text-2xl font-semibold">Entradas</h1>
                ${puedeAccion(this.usuario, 'agregar_entrada') ? '<button type="button" data-agregar class="rounded-lg bg-acento px-4 py-2 text-sm font-medium text-white hover:opacity-90">Agregar Entrada</button>' : ''}
            </div>
            <div data-tabla></div>
        `;

        this.contenedor.querySelector('[data-agregar]')?.addEventListener('click', () => this._abrirFormulario());

        const acciones = [];
        if (puedeEditarRegistros(this.usuario)) {
            acciones.push({ etiqueta: 'Editar', onClick: (fila) => this._abrirFormulario(fila) });
        }
        acciones.push({
            etiqueta: 'Eliminar',
            claseCss: 'text-red-600 hover:bg-red-50',
            visible: (fila) => !fila.fecha_salida && puedeAccion(this.usuario, 'eliminar_entrada'),
            onClick: (fila) => this._eliminar(fila),
        });

        this.tabla = new DataTable({
            contenedor: this.contenedor.querySelector('[data-tabla]'),
            columnas: [
                { clave: 'fecha_ingreso', etiqueta: 'Fecha', formato: (v) => escaparHtml(formatearFecha(v)), filtro: { tipo: 'rango_fecha', clave: 'fecha' } },
                { clave: 'usuario_registra_nombre', etiqueta: 'Usuario que Registra' },
                { clave: 'coleccion_descripcion', etiqueta: 'Colección' },
                {
                    clave: 'almacen_nombre', etiqueta: 'Almacén',
                    filtro: { tipo: 'seleccion', clave: 'id_almacen', opciones: this.almacenes.map((a) => ({ valor: a.id_almacen, etiqueta: a.nombre })) },
                },
                { clave: 'numero_serie', etiqueta: 'Número de Serie', filtro: { tipo: 'texto' } },
                { clave: 'notas_entrada', etiqueta: 'Notas de Entrada', filtro: { tipo: 'texto' } },
            ],
            acciones,
            cargarPagina: (pagina, filtros) => this.api.get(this._url(pagina, filtros)),
            exportar: (filtros) => this.api.descargar(this._url(1, filtros, true), 'entradas.csv'),
            filaVacia: 'No hay entradas registradas.',
        });
    }

    _url(pagina, filtros, exportar = false) {
        const params = new URLSearchParams({ page: pagina, ...filtros });
        if (exportar) params.set('export', 'csv');
        return `/api/entradas?${params.toString()}`;
    }

    async _abrirFormulario(entrada = null) {
        let colecciones = [];
        try {
            const resultado = await this.api.get('/api/inventario?page=1');
            colecciones = resultado.datos || [];
        } catch {
            this.toast.error('No se pudieron cargar las colecciones.');
            return;
        }

        const opciones = colecciones
            .map((c) => `<option value="${c.id_coleccion}" ${entrada?.id_coleccion === c.id_coleccion ? 'selected' : ''}>${escaparHtml(`${c.descripcion} — ${c.nombre_almacen}`)}</option>`)
            .join('');

        const modal = new Modal({
            titulo: entrada ? 'Editar Entrada' : 'Agregar Entrada',
            contenidoHtml: `
                <form data-form class="space-y-4">
                    <label class="block text-sm">
                        Colección
                        <select name="id_coleccion" required class="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm">
                            <option value="">Seleccione…</option>
                            ${opciones}
                        </select>
                    </label>
                    <label class="block text-sm">
                        Número de Serie
                        <input type="text" name="numero_serie" required ${entrada ? 'readonly' : ''} value="${escaparHtml(entrada?.numero_serie || '')}"
                               class="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm ${entrada ? 'opacity-60' : ''}">
                    </label>
                    <label class="block text-sm">
                        Notas de Entrada
                        <textarea name="notas_entrada" rows="3" class="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm">${escaparHtml(entrada?.notas_entrada || '')}</textarea>
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
                        if (entrada) {
                            await this.api.put('/api/entradas', { ...datos, numero_serie: entrada.numero_serie });
                        } else {
                            await this.api.post('/api/entradas', datos);
                        }
                        this.toast.exito('Entrada guardada correctamente.');
                        modal.cerrar();
                        this.tabla.cargar();
                    } catch (error) {
                        this.toast.error(error.message || 'No se pudo guardar la entrada.');
                    }
                });
            },
        });
        modal.abrir();
    }

    async _eliminar(fila) {
        const confirmado = await Modal.confirmar({
            titulo: 'Eliminar entrada',
            mensaje: `¿Eliminar el ítem ${fila.numero_serie}? Esta acción no se puede deshacer.`,
            textoConfirmar: 'Eliminar',
        });
        if (!confirmado) return;

        try {
            await this.api.eliminar(`/api/entradas?numero_serie=${encodeURIComponent(fila.numero_serie)}`);
            this.toast.exito('Entrada eliminada.');
            this.tabla.cargar();
        } catch (error) {
            this.toast.error(error.message || 'No se pudo eliminar la entrada.');
        }
    }
}
