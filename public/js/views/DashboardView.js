import { escaparHtml, formatearFecha } from '../core/Utilidades.js';

let promesaChartJs = null;
function cargarChartJs() {
    if (window.Chart) return Promise.resolve();
    if (!promesaChartJs) {
        promesaChartJs = new Promise((resolver, rechazar) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.9/dist/chart.umd.min.js';
            script.onload = resolver;
            script.onerror = rechazar;
            document.head.appendChild(script);
        });
    }
    return promesaChartJs;
}

/** Dashboard (5.1): solo administradores. */
export default class DashboardView {
    constructor({ api, toast, contenedor }) {
        this.api = api;
        this.toast = toast;
        this.contenedor = contenedor;
        this.periodoActual = 'mes';
        this.graficos = [];
    }

    async render() {
        this.contenedor.innerHTML = `<p class="text-texto-secundario">Cargando dashboard…</p>`;

        let datos;
        try {
            datos = await this.api.get('/api/dashboard');
        } catch (error) {
            this.contenedor.innerHTML = `<p class="text-red-600">${escaparHtml(error.message || 'No se pudo cargar el dashboard.')}</p>`;
            return;
        }
        this.datos = datos;

        this.contenedor.innerHTML = `
            <h1 class="text-2xl font-semibold mb-4">Dashboard</h1>

            <div data-alertas class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-6"></div>

            <div class="grid gap-4 lg:grid-cols-2 mb-6">
                <div class="rounded-xl border border-borde bg-superficie p-4">
                    <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <h2 class="text-sm font-semibold">Stock por Almacén</h2>
                        <select data-filtro-conjunto-stock class="rounded-lg border border-borde bg-fondo px-2 py-1 text-xs max-w-[180px]">
                            <option value="">Todos los artículos</option>
                        </select>
                    </div>
                    <canvas data-grafico-stock height="220"></canvas>
                </div>
                <div class="rounded-xl border border-borde bg-superficie p-4">
                    <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <h2 class="text-sm font-semibold">Salidas por Almacén (últimos 30 días)</h2>
                        <select data-filtro-conjunto-salidas class="rounded-lg border border-borde bg-fondo px-2 py-1 text-xs max-w-[180px]">
                            <option value="">Todos los artículos</option>
                        </select>
                    </div>
                    <canvas data-grafico-salidas height="220"></canvas>
                </div>
            </div>

            <div class="rounded-xl border border-borde bg-superficie p-4 mb-6">
                <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <h2 class="text-sm font-semibold">Ítems con más salidas</h2>
                    <div class="flex gap-1 text-xs" data-periodos>
                        <button type="button" data-periodo="semana" class="rounded-lg border border-borde px-2.5 py-1 hover:bg-fondo">Semana</button>
                        <button type="button" data-periodo="mes" class="rounded-lg border border-borde px-2.5 py-1 hover:bg-fondo">Mes</button>
                        <button type="button" data-periodo="anio" class="rounded-lg border border-borde px-2.5 py-1 hover:bg-fondo">Año</button>
                    </div>
                </div>
                <canvas data-grafico-top height="220"></canvas>
            </div>

            <div class="rounded-xl border border-borde bg-superficie overflow-hidden">
                <h2 class="text-sm font-semibold px-4 py-3 border-b border-borde">Movimientos Recientes</h2>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b border-borde bg-fondo text-left text-xs uppercase tracking-wide text-texto-secundario">
                                <th class="px-4 py-2.5 font-medium">Fecha</th>
                                <th class="px-4 py-2.5 font-medium">Número de Serie</th>
                                <th class="px-4 py-2.5 font-medium">Colección</th>
                                <th class="px-4 py-2.5 font-medium">Almacén</th>
                                <th class="px-4 py-2.5 font-medium">Estado</th>
                            </tr>
                        </thead>
                        <tbody data-movimientos></tbody>
                    </table>
                </div>
            </div>
        `;

        this._pintarAlertas(datos.alertas_stock_bajo);
        this._pintarMovimientos(datos.movimientos_recientes);
        this._pintarFiltroConjuntos('[data-filtro-conjunto-stock]', (indice) => this._actualizarGraficoStock(indice));
        this._pintarFiltroConjuntos('[data-filtro-conjunto-salidas]', (indice) => this._actualizarGraficoSalidas(indice));

        this.contenedor.querySelectorAll('[data-periodo]').forEach((boton) => {
            boton.addEventListener('click', () => {
                this.periodoActual = boton.dataset.periodo;
                this._pintarBotonesPeriodo();
                this._pintarGraficoTop();
            });
        });
        this._pintarBotonesPeriodo();

        try {
            await cargarChartJs();
            this._pintarGraficoStock();
            this._pintarGraficoSalidas();
            this._pintarGraficoTop();
        } catch {
            this.toast.error('No se pudieron cargar las gráficas (sin conexión a la CDN).');
        }
    }

    _pintarAlertas(alertas) {
        const contenedor = this.contenedor.querySelector('[data-alertas]');
        if (!alertas.length) {
            contenedor.innerHTML = `<div class="rounded-xl border border-borde bg-superficie p-4 text-sm text-texto-secundario">Sin alertas de stock bajo. 👍</div>`;
            return;
        }
        contenedor.innerHTML = alertas
            .map((a) => {
                const critico = Number(a.stock) === 0;
                return `
                    <div class="rounded-xl border ${critico ? 'border-red-300' : 'border-amber-300'} bg-superficie p-4">
                        <p class="text-xs font-medium ${critico ? 'text-red-600' : 'text-amber-600'} uppercase tracking-wide">${critico ? 'Sin stock' : 'Stock bajo'}</p>
                        <p class="text-sm font-medium mt-1">${escaparHtml(a.descripcion)}</p>
                        <p class="text-xs text-texto-secundario mt-1">${escaparHtml(a.nombre_almacen)} · Stock: ${a.stock} / Umbral: ${a.umbral_stock_bajo}</p>
                    </div>
                `;
            })
            .join('');
    }

    _pintarMovimientos(movimientos) {
        const cuerpo = this.contenedor.querySelector('[data-movimientos]');
        if (!movimientos.length) {
            cuerpo.innerHTML = `<tr><td colspan="5" class="px-4 py-6 text-center text-texto-secundario">Sin movimientos recientes.</td></tr>`;
            return;
        }
        cuerpo.innerHTML = movimientos
            .map(
                (m) => `
                <tr class="border-b border-borde last:border-0">
                    <td class="px-4 py-2.5">${escaparHtml(formatearFecha(m.fecha_ingreso))}</td>
                    <td class="px-4 py-2.5">${escaparHtml(m.numero_serie)}</td>
                    <td class="px-4 py-2.5">${escaparHtml(m.coleccion_descripcion)}</td>
                    <td class="px-4 py-2.5">${escaparHtml(m.almacen_nombre)}</td>
                    <td class="px-4 py-2.5">${m.fecha_salida ? '<span class="text-texto-secundario">Con salida</span>' : '<span class="text-emerald-600">En stock</span>'}</td>
                </tr>
            `
            )
            .join('');
    }

    _pintarFiltroConjuntos(selector, alCambiar) {
        const select = this.contenedor.querySelector(selector);
        if (!select) return;

        const opciones = (this.datos.conjuntos_disponibles || [])
            .map((c, i) => `<option value="${i}">${escaparHtml(c.descripcion)}</option>`)
            .join('');
        select.insertAdjacentHTML('beforeend', opciones);
        select.addEventListener('change', () => alCambiar(select.value));
    }

    _construirQueryConjunto(indice, prefijo) {
        const conjunto = indice !== '' ? (this.datos.conjuntos_disponibles || [])[Number(indice)] : null;
        if (!conjunto) return '';
        const clave = (sufijo) => (prefijo ? `${prefijo}_${sufijo}` : sufijo);
        return `?${clave('item')}=${encodeURIComponent(conjunto.item)}&${clave('tipo')}=${encodeURIComponent(conjunto.tipo)}&${clave('medidas')}=${encodeURIComponent(conjunto.medidas)}`;
    }

    async _actualizarGraficoSalidas(indice) {
        const select = this.contenedor.querySelector('[data-filtro-conjunto-salidas]');
        select.disabled = true;

        try {
            const resultado = await this.api.get(`/api/dashboard${this._construirQueryConjunto(indice, '')}`);
            this.datos.salidas_por_almacen_30d = resultado.salidas_por_almacen_30d;
            this._pintarGraficoSalidas();
        } catch (error) {
            this.toast.error(error.message || 'No se pudo actualizar la gráfica.');
        } finally {
            select.disabled = false;
        }
    }

    async _actualizarGraficoStock(indice) {
        const select = this.contenedor.querySelector('[data-filtro-conjunto-stock]');
        select.disabled = true;

        try {
            const resultado = await this.api.get(`/api/dashboard${this._construirQueryConjunto(indice, 'stock')}`);
            this.datos.stock_por_almacen = resultado.stock_por_almacen;
            this._pintarGraficoStock();
        } catch (error) {
            this.toast.error(error.message || 'No se pudo actualizar la gráfica.');
        } finally {
            select.disabled = false;
        }
    }

    _pintarBotonesPeriodo() {
        this.contenedor.querySelectorAll('[data-periodo]').forEach((boton) => {
            const activo = boton.dataset.periodo === this.periodoActual;
            boton.classList.toggle('bg-acento', activo);
            boton.classList.toggle('text-white', activo);
            boton.classList.toggle('border-acento', activo);
        });
    }

    _colorPaleta(i) {
        const paleta = ['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
        return paleta[i % paleta.length];
    }

    _destruirGrafico(referencia) {
        referencia?.destroy();
    }

    _pintarGraficoStock() {
        const ctx = this.contenedor.querySelector('[data-grafico-stock]');
        if (!ctx) return;
        const datos = this.datos.stock_por_almacen;
        this._graficoStock?.destroy();
        this._graficoStock = new window.Chart(ctx, {
            type: 'bar',
            data: {
                labels: datos.map((d) => d.nombre_almacen),
                datasets: [{ label: 'Stock', data: datos.map((d) => Number(d.stock_total)), backgroundColor: datos.map((_, i) => this._colorPaleta(i)) }],
            },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
        });
    }

    _pintarGraficoSalidas() {
        const ctx = this.contenedor.querySelector('[data-grafico-salidas]');
        if (!ctx || !window.Chart) return;
        const datos = this.datos.salidas_por_almacen_30d;
        this._graficoSalidas?.destroy();
        this._graficoSalidas = new window.Chart(ctx, {
            type: 'bar',
            data: {
                labels: datos.map((d) => d.nombre_almacen),
                datasets: [{ label: 'Salidas (30 días)', data: datos.map((d) => Number(d.total_salidas)), backgroundColor: datos.map((_, i) => this._colorPaleta(i + 2)) }],
            },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
        });
    }

    async _pintarGraficoTop() {
        const ctx = this.contenedor.querySelector('[data-grafico-top]');
        if (!ctx || !window.Chart) return;
        const datos = this.datos[`top_items_${this.periodoActual}`] || [];
        this._graficoTop?.destroy();
        this._graficoTop = new window.Chart(ctx, {
            type: 'bar',
            data: {
                labels: datos.map((d) => d.descripcion),
                datasets: [{ label: 'Salidas', data: datos.map((d) => Number(d.total_salidas)), backgroundColor: datos.map((_, i) => this._colorPaleta(i + 1)) }],
            },
            options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } },
        });
    }

    destruir() {
        this._graficoStock?.destroy();
        this._graficoSalidas?.destroy();
        this._graficoTop?.destroy();
    }
}
