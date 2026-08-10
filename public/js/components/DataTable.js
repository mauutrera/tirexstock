import FilterBar from './FilterBar.js';
import { escaparHtml } from '../core/Utilidades.js';

/**
 * Tabla genérica con paginado (20/página), filtros por columna y botón de
 * exportar — la reutilizan todas las vistas con listados (5.2 a 5.11) para
 * no duplicar la lógica de paginación/filtros en cada una.
 */
export default class DataTable {
    constructor({ contenedor, columnas, cargarPagina, acciones = [], exportar = null, filaVacia = 'Sin registros.' }) {
        this.contenedor = contenedor;
        this.columnas = columnas;
        this.cargarPagina = cargarPagina;
        this.acciones = acciones;
        this.exportar = exportar;
        this.filaVacia = filaVacia;
        this.paginaActual = 1;
        this.filtros = {};
        this.datosActuales = [];
        this._render();
    }

    _render() {
        this.contenedor.innerHTML = `
            <div data-filtros></div>
            <div class="rounded-xl border border-borde bg-superficie overflow-hidden">
                <div class="flex items-center justify-between px-4 py-3 border-b border-borde">
                    <span data-resumen class="text-xs text-texto-secundario"></span>
                    ${this.exportar ? '<button type="button" data-exportar class="rounded-lg border border-borde px-3 py-1.5 text-xs font-medium hover:bg-fondo">Exportar a Excel</button>' : ''}
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b border-borde bg-fondo text-left text-xs uppercase tracking-wide text-texto-secundario">
                                ${this.columnas.map((c) => `<th class="px-4 py-2.5 font-medium whitespace-nowrap">${c.etiqueta}</th>`).join('')}
                                ${this.acciones.length ? '<th class="px-4 py-2.5 font-medium text-right">Acciones</th>' : ''}
                            </tr>
                        </thead>
                        <tbody data-cuerpo></tbody>
                    </table>
                </div>
                <div class="flex items-center justify-between px-4 py-3 border-t border-borde text-sm" data-paginacion></div>
            </div>
        `;

        new FilterBar({
            contenedor: this.contenedor.querySelector('[data-filtros]'),
            columnas: this.columnas,
            alFiltrar: (filtros) => {
                this.filtros = filtros;
                this.paginaActual = 1;
                this.cargar();
            },
        });

        this.contenedor.querySelector('[data-exportar]')?.addEventListener('click', () => this.exportar(this.filtros));

        this.contenedor.querySelector('[data-cuerpo]').addEventListener('click', (evento) => {
            const boton = evento.target.closest('[data-accion-idx]');
            if (!boton) return;
            const accion = this.acciones[Number(boton.dataset.accionIdx)];
            const fila = this.datosActuales[Number(boton.dataset.filaIdx)];
            accion?.onClick(fila);
        });

        this.cargar();
    }

    async cargar() {
        const cuerpo = this.contenedor.querySelector('[data-cuerpo]');
        const colspan = this.columnas.length + (this.acciones.length ? 1 : 0);
        cuerpo.innerHTML = `<tr><td colspan="${colspan}" class="px-4 py-8 text-center text-texto-secundario">Cargando…</td></tr>`;

        try {
            const resultado = await this.cargarPagina(this.paginaActual, this.filtros);
            this._renderFilas(resultado, colspan);
        } catch (error) {
            cuerpo.innerHTML = `<tr><td colspan="${colspan}" class="px-4 py-8 text-center text-red-600">${escaparHtml(error.message || 'Error al cargar los datos.')}</td></tr>`;
        }
    }

    _renderFilas(resultado, colspan) {
        const { datos, total, pagina, por_pagina: porPagina } = resultado;
        this.datosActuales = datos;
        const cuerpo = this.contenedor.querySelector('[data-cuerpo]');

        if (!datos.length) {
            cuerpo.innerHTML = `<tr><td colspan="${colspan}" class="px-4 py-8 text-center text-texto-secundario">${escaparHtml(this.filaVacia)}</td></tr>`;
        } else {
            cuerpo.innerHTML = datos
                .map((fila, indiceFila) => {
                    const celdas = this.columnas
                        .map((columna) => `<td class="px-4 py-2.5 align-top">${this._valorCelda(columna, fila)}</td>`)
                        .join('');
                    const accionesHtml = this.acciones.length
                        ? `<td class="px-4 py-2.5 text-right whitespace-nowrap space-x-1">${this.acciones
                              .map((accion, indiceAccion) =>
                                  !accion.visible || accion.visible(fila)
                                      ? `<button type="button" data-accion-idx="${indiceAccion}" data-fila-idx="${indiceFila}" class="rounded-lg px-2 py-1 text-xs font-medium ${accion.claseCss || 'text-acento-texto hover:bg-fondo'}">${escaparHtml(accion.etiqueta)}</button>`
                                      : ''
                              )
                              .join('')}</td>`
                        : '';
                    return `<tr class="border-b border-borde last:border-0 hover:bg-fondo/60">${celdas}${accionesHtml}</tr>`;
                })
                .join('');
        }

        const total_ = total ?? datos.length;
        const totalPaginas = Math.max(1, Math.ceil(total_ / (porPagina || 20)));
        this.contenedor.querySelector('[data-resumen]').textContent = `${total_} registro(s)`;
        this._renderPaginacion(pagina || this.paginaActual, totalPaginas);
    }

    _valorCelda(columna, fila) {
        if (typeof columna.formato === 'function') {
            return columna.formato(fila[columna.clave], fila);
        }
        return escaparHtml(fila[columna.clave]);
    }

    _renderPaginacion(pagina, totalPaginas) {
        const contenedor = this.contenedor.querySelector('[data-paginacion]');
        contenedor.innerHTML = `
            <button type="button" data-anterior class="rounded-lg border border-borde px-3 py-1.5 disabled:opacity-40" ${pagina <= 1 ? 'disabled' : ''}>Anterior</button>
            <span class="text-texto-secundario">Página ${pagina} de ${totalPaginas}</span>
            <button type="button" data-siguiente class="rounded-lg border border-borde px-3 py-1.5 disabled:opacity-40" ${pagina >= totalPaginas ? 'disabled' : ''}>Siguiente</button>
        `;
        contenedor.querySelector('[data-anterior]').addEventListener('click', () => {
            if (this.paginaActual > 1) {
                this.paginaActual -= 1;
                this.cargar();
            }
        });
        contenedor.querySelector('[data-siguiente]').addEventListener('click', () => {
            if (this.paginaActual < totalPaginas) {
                this.paginaActual += 1;
                this.cargar();
            }
        });
    }
}
