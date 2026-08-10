/**
 * Fila de filtros compactos alineada al encabezado de una tabla (3.4 / 5.7):
 * texto libre, catálogo (select) o fecha/rango de fechas, con botón para
 * limpiar filtros. La usa DataTable internamente.
 */
export default class FilterBar {
    constructor({ contenedor, columnas, alFiltrar }) {
        this.contenedor = contenedor;
        this.columnas = columnas.filter((c) => c.filtro);
        this.alFiltrar = alFiltrar;
        this.render();
    }

    render() {
        if (this.columnas.length === 0) {
            this.contenedor.innerHTML = '';
            return;
        }

        const campos = this.columnas.map((columna) => this._renderCampo(columna)).join('');

        this.contenedor.innerHTML = `
            <form data-form-filtros class="flex flex-wrap items-end gap-3 mb-3">
                ${campos}
                <div class="flex gap-2">
                    <button type="submit" class="rounded-lg bg-acento px-3 py-2 text-sm font-medium text-white hover:opacity-90">Buscar</button>
                    <button type="button" data-limpiar-filtros class="rounded-lg border border-borde px-3 py-2 text-sm font-medium hover:bg-fondo">Limpiar</button>
                </div>
            </form>
        `;

        const form = this.contenedor.querySelector('[data-form-filtros]');
        form.addEventListener('submit', (evento) => {
            evento.preventDefault();
            this.alFiltrar(this._leerValores(form));
        });
        form.querySelector('[data-limpiar-filtros]').addEventListener('click', () => {
            form.reset();
            this.alFiltrar({});
        });
    }

    _renderCampo(columna) {
        const { clave, etiqueta, filtro } = columna;
        const nombre = filtro.clave || clave;

        if (filtro.tipo === 'seleccion') {
            const opciones = (filtro.opciones || [])
                .map((o) => `<option value="${o.valor}">${o.etiqueta}</option>`)
                .join('');
            return `
                <label class="flex flex-col gap-1 text-xs text-texto-secundario">
                    ${etiqueta}
                    <select name="${nombre}" class="rounded-lg border border-borde bg-fondo px-2 py-1.5 text-sm text-texto">
                        <option value="">Todos</option>
                        ${opciones}
                    </select>
                </label>
            `;
        }

        if (filtro.tipo === 'rango_fecha') {
            return `
                <label class="flex flex-col gap-1 text-xs text-texto-secundario">
                    ${etiqueta} (desde)
                    <input type="date" name="${nombre}_desde" class="rounded-lg border border-borde bg-fondo px-2 py-1.5 text-sm text-texto">
                </label>
                <label class="flex flex-col gap-1 text-xs text-texto-secundario">
                    ${etiqueta} (hasta)
                    <input type="date" name="${nombre}_hasta" class="rounded-lg border border-borde bg-fondo px-2 py-1.5 text-sm text-texto">
                </label>
            `;
        }

        if (filtro.tipo === 'fecha') {
            return `
                <label class="flex flex-col gap-1 text-xs text-texto-secundario">
                    ${etiqueta}
                    <input type="date" name="${nombre}" class="rounded-lg border border-borde bg-fondo px-2 py-1.5 text-sm text-texto">
                </label>
            `;
        }

        return `
            <label class="flex flex-col gap-1 text-xs text-texto-secundario">
                ${etiqueta}
                <input type="text" name="${nombre}" placeholder="Buscar..." class="rounded-lg border border-borde bg-fondo px-2 py-1.5 text-sm text-texto">
            </label>
        `;
    }

    _leerValores(form) {
        const datos = new FormData(form);
        const valores = {};
        for (const [clave, valor] of datos.entries()) {
            if (valor !== '') valores[clave] = valor;
        }
        return valores;
    }
}
