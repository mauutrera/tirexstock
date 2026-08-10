import DataTable from '../components/DataTable.js';
import Modal from '../components/Modal.js';
import { escaparHtml, formatearFecha } from '../core/Utilidades.js';
import { puedeAccion, puedeEditarRegistros } from '../core/PermisosCliente.js';

/** Vista de Salidas (5.3). */
export default class SalidasView {
    constructor({ api, usuario, toast, contenedor }) {
        this.api = api;
        this.usuario = usuario;
        this.toast = toast;
        this.contenedor = contenedor;
    }

    async render() {
        this.contenedor.innerHTML = `
            <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h1 class="text-2xl font-semibold">Salidas</h1>
                ${puedeAccion(this.usuario, 'marcar_salida') ? '<button type="button" data-agregar class="rounded-lg bg-acento px-4 py-2 text-sm font-medium text-white hover:opacity-90">Agregar Salida</button>' : ''}
            </div>
            <div data-tabla></div>
        `;

        this.contenedor.querySelector('[data-agregar]')?.addEventListener('click', () => this._abrirBuscador());

        const acciones = [];
        if (puedeEditarRegistros(this.usuario)) {
            acciones.push({ etiqueta: 'Editar', onClick: (fila) => this._abrirEdicion(fila) });
        }
        acciones.push({
            etiqueta: 'Eliminar',
            claseCss: 'text-red-600 hover:bg-red-50',
            visible: () => puedeAccion(this.usuario, 'desmarcar_salida'),
            onClick: (fila) => this._desmarcar(fila),
        });

        this.tabla = new DataTable({
            contenedor: this.contenedor.querySelector('[data-tabla]'),
            columnas: [
                { clave: 'fecha_salida', etiqueta: 'Fecha', formato: (v) => escaparHtml(formatearFecha(v)), filtro: { tipo: 'rango_fecha', clave: 'fecha' } },
                { clave: 'usuario_retira_nombre', etiqueta: 'Usuario que Retira' },
                { clave: 'coleccion_descripcion', etiqueta: 'Colección' },
                { clave: 'almacen_nombre', etiqueta: 'Almacén' },
                { clave: 'numero_serie', etiqueta: 'Número de Serie', filtro: { tipo: 'texto' } },
                { clave: 'responsable_recibe', etiqueta: 'Responsable que Recibe' },
                { clave: 'notas_salida', etiqueta: 'Notas de Salida', filtro: { tipo: 'texto', clave: 'notas_salida' } },
            ],
            acciones,
            cargarPagina: (pagina, filtros) => this.api.get(this._url(pagina, filtros)),
            exportar: (filtros) => this.api.descargar(this._url(1, filtros, true), 'salidas.csv'),
            filaVacia: 'No hay salidas registradas.',
        });
    }

    _url(pagina, filtros, exportar = false) {
        const params = new URLSearchParams({ page: pagina, ...filtros });
        if (exportar) params.set('export', 'csv');
        return `/api/salidas?${params.toString()}`;
    }

    _abrirBuscador() {
        const modal = new Modal({
            titulo: 'Agregar Salida',
            contenidoHtml: `
                <form data-form-buscar class="flex gap-2">
                    <input type="text" name="serie" required placeholder="Buscar por número de serie…" class="flex-1 rounded-lg border border-borde bg-fondo px-3 py-2 text-sm">
                    <button type="submit" class="rounded-lg bg-acento px-3 py-2 text-sm font-medium text-white hover:opacity-90">Buscar</button>
                </form>
                <div data-resultado class="mt-4 space-y-2 max-h-80 overflow-y-auto"></div>
            `,
            onMontar: (overlay) => {
                overlay.querySelector('[data-form-buscar]').addEventListener('submit', async (evento) => {
                    evento.preventDefault();
                    const serie = new FormData(evento.target).get('serie');
                    const resultado = overlay.querySelector('[data-resultado]');
                    resultado.innerHTML = '<p class="text-sm text-texto-secundario">Buscando…</p>';
                    try {
                        const { items } = await this.api.get(`/api/salidas?buscar=${encodeURIComponent(serie)}`);
                        if (!items.length) {
                            resultado.innerHTML = '<p class="text-sm text-red-600">Sin resultados en sus almacenes.</p>';
                            return;
                        }
                        resultado.innerHTML = items
                            .map(
                                (item, i) => `
                                <button type="button" data-item="${i}" class="w-full text-left rounded-lg border border-borde p-3 text-sm hover:bg-fondo transition">
                                    <p class="font-medium">${escaparHtml(item.numero_serie)}</p>
                                    <p class="text-texto-secundario">${escaparHtml(item.coleccion_descripcion)} · ${escaparHtml(item.almacen_nombre)}</p>
                                </button>
                            `
                            )
                            .join('')
                            + (items.length === 20 ? '<p class="text-xs text-texto-secundario pt-1">Mostrando los primeros 20 resultados. Refina la búsqueda si no encuentras el ítem.</p>' : '');
                        resultado.querySelectorAll('[data-item]').forEach((boton) => {
                            boton.addEventListener('click', () => {
                                modal.cerrar();
                                this._abrirFormularioSalida(items[Number(boton.dataset.item)]);
                            });
                        });
                    } catch (error) {
                        resultado.innerHTML = `<p class="text-sm text-red-600">${escaparHtml(error.message || 'Error al buscar.')}</p>`;
                    }
                });
            },
        });
        modal.abrir();
    }

    _abrirFormularioSalida(item) {
        const modal = new Modal({
            titulo: `Marcar Salida — ${item.numero_serie}`,
            contenidoHtml: `
                <form data-form class="space-y-4">
                    <label class="block text-sm">
                        Responsable que Recibe
                        <input type="text" name="responsable_recibe" class="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm">
                    </label>
                    <label class="block text-sm">
                        Unidad Percibida
                        <input type="text" name="unidad_percibida" class="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm">
                    </label>
                    <label class="block text-sm">
                        Posición
                        <input type="text" name="posicion" class="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm">
                    </label>
                    <label class="block text-sm">
                        Notas de Salida
                        <textarea name="notas_salida" rows="3" class="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm"></textarea>
                    </label>
                    <div class="flex justify-end gap-2 pt-2">
                        <button type="button" data-cerrar-modal class="rounded-lg border border-borde px-3 py-2 text-sm font-medium hover:bg-fondo">Cancelar</button>
                        <button type="submit" class="rounded-lg bg-acento px-3 py-2 text-sm font-medium text-white hover:opacity-90">Confirmar Salida</button>
                    </div>
                </form>
            `,
            onMontar: (overlay) => {
                overlay.querySelector('[data-form]').addEventListener('submit', async (evento) => {
                    evento.preventDefault();
                    const datos = Object.fromEntries(new FormData(evento.target).entries());
                    try {
                        await this.api.post('/api/salidas', { ...datos, numero_serie: item.numero_serie });
                        this.toast.exito('Salida registrada correctamente.');
                        modal.cerrar();
                        this.tabla.cargar();
                    } catch (error) {
                        this.toast.error(error.message || 'No se pudo registrar la salida.');
                    }
                });
            },
        });
        modal.abrir();
    }

    _abrirEdicion(fila) {
        const modal = new Modal({
            titulo: `Editar Salida — ${fila.numero_serie}`,
            contenidoHtml: `
                <form data-form class="space-y-4">
                    <label class="block text-sm">
                        Responsable que Recibe
                        <input type="text" name="responsable_recibe" value="${escaparHtml(fila.responsable_recibe || '')}" class="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm">
                    </label>
                    <label class="block text-sm">
                        Unidad Percibida
                        <input type="text" name="unidad_percibida" value="${escaparHtml(fila.unidad_percibida || '')}" class="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm">
                    </label>
                    <label class="block text-sm">
                        Posición
                        <input type="text" name="posicion" value="${escaparHtml(fila.posicion || '')}" class="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm">
                    </label>
                    <label class="block text-sm">
                        Notas de Salida
                        <textarea name="notas_salida" rows="3" class="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm">${escaparHtml(fila.notas_salida || '')}</textarea>
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
                        await this.api.put('/api/salidas', { ...datos, numero_serie: fila.numero_serie });
                        this.toast.exito('Salida actualizada.');
                        modal.cerrar();
                        this.tabla.cargar();
                    } catch (error) {
                        this.toast.error(error.message || 'No se pudo actualizar la salida.');
                    }
                });
            },
        });
        modal.abrir();
    }

    async _desmarcar(fila) {
        const confirmado = await Modal.confirmar({
            titulo: 'Desmarcar salida',
            mensaje: `¿Desmarcar la salida de ${fila.numero_serie}? El ítem regresará al stock.`,
            textoConfirmar: 'Desmarcar',
        });
        if (!confirmado) return;

        try {
            await this.api.eliminar(`/api/salidas?numero_serie=${encodeURIComponent(fila.numero_serie)}`);
            this.toast.exito('Salida desmarcada; el ítem volvió al stock.');
            this.tabla.cargar();
        } catch (error) {
            this.toast.error(error.message || 'No se pudo desmarcar la salida.');
        }
    }
}
