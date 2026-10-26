import { escaparHtml } from '../core/Utilidades.js';

let promesaChartJs = null;
function cargarChartJs() {
    if (window.Chart) return Promise.resolve();
    if (!promesaChartJs) {
        promesaChartJs = new Promise((resolver, rechazar) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.9/dist/chart.umd.min.js';
            script.onload = resolver;
            script.onerror = () => {
                promesaChartJs = null;
                rechazar();
            };
            document.head.appendChild(script);
        });
    }
    return promesaChartJs;
}

const PERIODOS = [
    { dias: 7, etiqueta: '7 días' },
    { dias: 30, etiqueta: '30 días' },
    { dias: 90, etiqueta: '90 días' },
    { dias: 365, etiqueta: '12 meses' },
];

const TIPOS_OPERACION = {
    ingreso: { etiqueta: 'Ingreso', verbo: 'registró el ingreso de', clase: 'bg-blue-500/10 text-blue-600 dark:text-blue-300', icono: '<path d="M12 4v12m0 0-4-4m4 4 4-4M5 20h14"/>' },
    salida: { etiqueta: 'Salida', verbo: 'registró la salida de', clase: 'bg-orange-500/10 text-orange-600 dark:text-orange-300', icono: '<path d="M12 20V8m0 0 4 4m-4-4-4 4M5 4h14"/>' },
    edicion: { etiqueta: 'Edición', verbo: 'editó', clase: 'bg-slate-500/10 text-texto-secundario', icono: '<path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-4-4L4 16v4Z"/>' },
    desmarque_salida: { etiqueta: 'Desmarque', verbo: 'desmarcó la salida de', clase: 'bg-amber-500/10 text-amber-600 dark:text-amber-300', icono: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5"/>' },
    eliminacion: { etiqueta: 'Eliminación', verbo: 'eliminó la entrada de', clase: 'bg-red-500/10 text-red-600 dark:text-red-300', icono: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>' },
};

const numero = new Intl.NumberFormat('es-MX');
const fechaCorta = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' });

function aFecha(iso) {
    const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
    return new Date(a, m - 1, d);
}

function tiempoRelativo(valor) {
    const fecha = new Date(String(valor).replace(' ', 'T'));
    const minutos = Math.round((Date.now() - fecha.getTime()) / 60000);
    if (minutos < 1) return 'hace un momento';
    if (minutos < 60) return `hace ${minutos} min`;
    const horas = Math.round(minutos / 60);
    if (horas < 24) return `hace ${horas} h`;
    const dias = Math.round(horas / 24);
    if (dias < 30) return `hace ${dias} d`;
    return fechaCorta.format(fecha);
}

/** Lee un token de color del tema activo (claro/oscuro) definido en input.css. */
function token(nombre) {
    return getComputedStyle(document.documentElement).getPropertyValue(`--color-${nombre}`).trim();
}

/**
 * Dashboard (5.1): solo administradores. Una fila de filtros globales (almacén,
 * artículo, periodo) recorta todos los KPIs y gráficas a la vez. Cada gráfica
 * tiene su vista de tabla equivalente (botón "Tabla").
 */
export default class DashboardView {
    constructor({ api, toast, contenedor }) {
        this.api = api;
        this.toast = toast;
        this.contenedor = contenedor;
        this.filtros = { almacen: '', conjunto: '', dias: 30 };
        this.graficos = {};
        this.vistaTabla = new Set();
    }

    async render() {
        this.contenedor.innerHTML = `
            <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-6">
                <div>
                    <h1 class="text-2xl md:text-3xl font-bold">Dashboard</h1>
                    <p data-subtitulo class="text-sm text-texto-secundario mt-1">Cargando resumen de operación…</p>
                </div>
                <div class="flex flex-wrap items-center gap-2" data-filtros>
                    <select data-filtro="almacen" aria-label="Almacén" class="rounded-xl border border-borde bg-superficie px-3 py-2 text-sm max-w-[200px]">
                        <option value="">Todos los almacenes</option>
                    </select>
                    <select data-filtro="conjunto" aria-label="Artículo" class="rounded-xl border border-borde bg-superficie px-3 py-2 text-sm max-w-[240px]">
                        <option value="">Todos los artículos</option>
                    </select>
                    <div class="inline-flex rounded-xl border border-borde bg-superficie p-1" role="group" aria-label="Periodo">
                        ${PERIODOS.map((p) => `<button type="button" data-dias="${p.dias}" class="rounded-lg px-3 py-1.5 text-xs font-medium">${p.etiqueta}</button>`).join('')}
                    </div>
                </div>
            </div>
            <div data-cuerpo class="transition-opacity duration-200">
                <p class="text-texto-secundario">Cargando dashboard…</p>
            </div>
        `;

        this.contenedor.querySelectorAll('[data-filtro]').forEach((select) => {
            select.addEventListener('change', () => {
                this.filtros[select.dataset.filtro] = select.value;
                this._cargar();
            });
        });
        this.contenedor.querySelectorAll('[data-dias]').forEach((boton) => {
            boton.addEventListener('click', () => {
                this.filtros.dias = Number(boton.dataset.dias);
                this._cargar();
            });
        });
        this._pintarPeriodos();

        // Las gráficas se pintan con los tokens del tema: al alternar claro/oscuro se repintan.
        this.observadorTema = new MutationObserver(() => this._pintarGraficos());
        this.observadorTema.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        await this._cargar();
    }

    _consulta() {
        const parametros = new URLSearchParams({ dias: String(this.filtros.dias) });
        if (this.filtros.almacen) parametros.set('almacen', this.filtros.almacen);
        const conjunto = this.datos?.conjuntos_disponibles?.[Number(this.filtros.conjunto)];
        if (this.filtros.conjunto !== '' && conjunto) {
            parametros.set('item', conjunto.item);
            parametros.set('tipo', conjunto.tipo);
            parametros.set('medidas', conjunto.medidas);
        }
        return parametros.toString();
    }

    async _cargar() {
        const cuerpo = this.contenedor.querySelector('[data-cuerpo]');
        // Recarga sin "parpadeo": se conserva lo anterior atenuado hasta tener datos.
        cuerpo.classList.add('opacity-50', 'pointer-events-none');
        this._pintarPeriodos();

        let datos;
        try {
            datos = await this.api.get(`/api/dashboard?${this._consulta()}`);
        } catch (error) {
            cuerpo.classList.remove('opacity-50', 'pointer-events-none');
            if (!this.datos) {
                cuerpo.innerHTML = `<p class="text-red-600">${escaparHtml(error.message || 'No se pudo cargar el dashboard.')}</p>`;
            } else {
                this.toast.error(error.message || 'No se pudo actualizar el dashboard.');
            }
            return;
        }

        const primeraCarga = !this.datos;
        this.datos = datos;
        if (primeraCarga) this._pintarOpcionesFiltros();

        const desde = fechaCorta.format(aFecha(datos.periodo.desde));
        const hasta = fechaCorta.format(aFecha(datos.periodo.hasta));
        this.contenedor.querySelector('[data-subtitulo]').textContent = `Resumen de operación del ${desde} al ${hasta}`;

        Object.values(this.graficos).forEach((grafico) => grafico.destroy());
        this.graficos = {};
        cuerpo.innerHTML = this._plantilla();
        cuerpo.classList.remove('opacity-50', 'pointer-events-none');
        this._enlazarTablas();
        this._pintarKpis();
        this._pintarActividadReciente();

        try {
            await cargarChartJs();
            this._pintarGraficos();
        } catch {
            this.toast.error('No se pudieron cargar las gráficas (sin conexión a la CDN). Usa la vista de tabla.');
            Object.keys(this._definiciones()).forEach((clave) => this._alternarTabla(clave, true));
        }
    }

    _pintarOpcionesFiltros() {
        const almacenes = this.contenedor.querySelector('[data-filtro="almacen"]');
        almacenes.insertAdjacentHTML('beforeend', (this.datos.almacenes_disponibles || [])
            .map((a) => `<option value="${a.id_almacen}">${escaparHtml(a.nombre)}</option>`).join(''));
        // Un admin de un solo almacén no necesita ese filtro.
        if (almacenes.options.length === 2) almacenes.classList.add('hidden');

        const conjuntos = this.contenedor.querySelector('[data-filtro="conjunto"]');
        conjuntos.insertAdjacentHTML('beforeend', (this.datos.conjuntos_disponibles || [])
            .map((c, i) => `<option value="${i}">${escaparHtml(c.descripcion)}</option>`).join(''));
    }

    _pintarPeriodos() {
        this.contenedor.querySelectorAll('[data-dias]').forEach((boton) => {
            const activo = Number(boton.dataset.dias) === this.filtros.dias;
            boton.classList.toggle('bg-acento', activo);
            boton.classList.toggle('text-white', activo);
            boton.classList.toggle('shadow-sm', activo);
            boton.classList.toggle('text-texto-secundario', !activo);
            boton.classList.toggle('hover:text-texto', !activo);
            boton.setAttribute('aria-pressed', String(activo));
        });
    }

    // ------------------------------------------------------------------
    // Estructura
    // ------------------------------------------------------------------

    _tarjetaGrafico(clave, titulo, subtitulo, { alto = 'h-72', leyenda = '' } = {}) {
        return `
            <section class="tarjeta p-5 flex flex-col min-w-0 h-full" data-tarjeta="${clave}">
                <header class="flex items-start justify-between gap-3 mb-4">
                    <div class="min-w-0">
                        <h2 class="text-sm font-semibold">${titulo}</h2>
                        <p class="text-xs text-texto-secundario mt-0.5">${subtitulo}</p>
                    </div>
                    <button type="button" data-alternar-tabla="${clave}" aria-pressed="false"
                            class="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-borde px-2.5 py-1 text-xs font-medium text-texto-secundario hover:bg-fondo hover:text-texto">
                        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 5h18M3 12h18M3 19h18"/></svg>
                        <span>Tabla</span>
                    </button>
                </header>
                ${leyenda ? `<div class="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs text-texto-secundario">${leyenda}</div>` : ''}
                <div data-grafico-contenedor="${clave}" class="relative ${alto}"><canvas data-grafico="${clave}" role="img" aria-label="${titulo}"></canvas></div>
                <div data-tabla="${clave}" class="hidden overflow-auto max-h-80 -mx-1"></div>
            </section>
        `;
    }

    _leyenda(series) {
        return series.map(([color, texto]) => `
            <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm" style="background: var(--color-${color})"></span>${texto}</span>
        `).join('');
    }

    _plantilla() {
        const d = this.datos;
        const agrupacion = d.periodo.agrupacion === 'semana' ? 'por semana' : 'por día';
        const alerta = d.kpis.colecciones_en_alerta > 0
            ? `
                <a href="/notificaciones" data-link class="flex items-center gap-3 rounded-2xl border border-amber-300/70 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 px-4 py-3 mb-6 text-sm hover:shadow-sm">
                    <span class="w-8 h-8 shrink-0 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>
                    </span>
                    <span class="flex-1"><strong class="font-semibold">${d.kpis.colecciones_en_alerta} colección(es) en o bajo el umbral de stock</strong>${d.kpis.colecciones_sin_stock ? ` · ${d.kpis.colecciones_sin_stock} sin stock` : ''}</span>
                    <span class="text-acento-texto font-medium whitespace-nowrap">Ver notificaciones &rarr;</span>
                </a>`
            : '';

        return `
            ${alerta}
            <div data-kpis class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6"></div>

            <div class="grid gap-4 xl:grid-cols-3 mb-4">
                <div class="xl:col-span-2 min-w-0">
                    ${this._tarjetaGrafico('movimientos', 'Entradas y salidas', `Llantas ingresadas y retiradas ${agrupacion}`, { alto: 'h-80', leyenda: this._leyenda([['serie-1', 'Entradas'], ['serie-2', 'Salidas']]) })}
                </div>
                ${this._tarjetaGrafico('stockAlmacen', 'Stock por almacén', 'Llantas disponibles hoy', { alto: 'h-80' })}
            </div>

            <div class="grid gap-4 lg:grid-cols-2 mb-4">
                ${this._tarjetaGrafico('stockColeccion', 'Stock por colección', 'Stock actual frente a su umbral de alerta', {
                    alto: 'h-80',
                    leyenda: `${this._leyenda([['acento', 'Stock'], ['estado-alerta', 'En umbral'], ['estado-critico', 'Sin stock']])}
                        <span class="inline-flex items-center gap-1.5"><span class="w-0.5 h-3 bg-texto"></span>Umbral</span>`,
                })}
                ${this._tarjetaGrafico('top', 'Colecciones con más salidas', 'Total de llantas retiradas en el periodo', { alto: 'h-80' })}
            </div>

            <div class="grid gap-4 lg:grid-cols-2 mb-4">
                ${this._tarjetaGrafico('movAlmacen', 'Movimientos por almacén', 'Entradas y salidas del periodo', { leyenda: this._leyenda([['serie-1', 'Entradas'], ['serie-2', 'Salidas']]) })}
                ${this._tarjetaGrafico('equipo', 'Actividad del equipo', 'Operaciones registradas por usuario', { leyenda: this._leyenda([['serie-1', 'Ingresos'], ['serie-2', 'Salidas'], ['serie-3', 'Ajustes']]) })}
            </div>

            <section class="tarjeta overflow-hidden">
                <header class="flex items-center justify-between px-5 py-4 border-b border-borde">
                    <div>
                        <h2 class="text-sm font-semibold">Actividad reciente</h2>
                        <p class="text-xs text-texto-secundario mt-0.5">Últimas operaciones registradas</p>
                    </div>
                    <a href="/historial" data-link class="text-xs font-medium text-acento-texto hover:underline">Ver historial &rarr;</a>
                </header>
                <ul data-actividad class="divide-y divide-borde"></ul>
            </section>
        `;
    }

    // ------------------------------------------------------------------
    // KPIs
    // ------------------------------------------------------------------

    _delta(actual, anterior) {
        if (!anterior) {
            return `<span class="text-texto-secundario">Sin datos del periodo anterior</span>`;
        }
        const cambio = ((actual - anterior) / anterior) * 100;
        const flecha = cambio > 0 ? '▲' : cambio < 0 ? '▼' : '●';
        return `<span class="font-medium text-texto">${flecha} ${Math.abs(cambio).toFixed(0)}%</span> <span class="text-texto-secundario">vs. periodo anterior (${numero.format(anterior)})</span>`;
    }

    /** Minigráfica SVG (sin Chart.js) de la tendencia del periodo. */
    _sparkline(valores, color) {
        if (valores.length < 2) return '';
        const ancho = 120;
        const alto = 36;
        const max = Math.max(...valores, 1);
        const puntos = valores.map((v, i) => `${((i / (valores.length - 1)) * ancho).toFixed(1)},${(alto - 3 - (v / max) * (alto - 6)).toFixed(1)}`);
        const [ultimoX, ultimoY] = puntos[puntos.length - 1].split(',');
        return `
            <svg viewBox="0 0 ${ancho} ${alto}" class="w-28 h-9 shrink-0 overflow-visible" aria-hidden="true">
                <polyline points="0,${alto} ${puntos.join(' ')} ${ancho},${alto}" fill="var(--color-${color})" fill-opacity="0.1" stroke="none"/>
                <polyline points="${puntos.join(' ')}" fill="none" stroke="var(--color-${color})" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
                <circle cx="${ultimoX}" cy="${ultimoY}" r="3.5" fill="var(--color-${color})" stroke="var(--color-superficie)" stroke-width="2"/>
            </svg>
        `;
    }

    _tile({ etiqueta, valor, unidad = '', pie, icono, sparkline = '' }) {
        return `
            <div class="tarjeta p-5 flex flex-col gap-3 min-w-0">
                <div class="flex items-center gap-2 text-sm text-texto-secundario">
                    <span class="w-8 h-8 rounded-lg bg-acento-suave text-acento-texto flex items-center justify-center shrink-0">
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icono}</svg>
                    </span>
                    <span class="font-medium">${etiqueta}</span>
                </div>
                <div class="flex items-end justify-between gap-3">
                    <p class="text-3xl font-semibold tracking-tight">${valor}<span class="text-base font-medium text-texto-secundario ml-1">${unidad}</span></p>
                    ${sparkline}
                </div>
                <p class="text-xs">${pie}</p>
            </div>
        `;
    }

    _pintarKpis() {
        const { kpis, serie_movimientos: serie } = this.datos;
        const cobertura = kpis.cobertura_dias;

        this.contenedor.querySelector('[data-kpis]').innerHTML = [
            this._tile({
                etiqueta: 'Stock disponible',
                valor: numero.format(kpis.stock_total),
                unidad: 'llantas',
                pie: `<span class="text-texto-secundario">En ${kpis.colecciones} colección(es)${kpis.colecciones_en_alerta ? ` · <span class="text-texto font-medium">⚠ ${kpis.colecciones_en_alerta} en alerta</span>` : ' · sin alertas'}</span>`,
                icono: '<path d="m3.3 7 8.7 5 8.7-5M12 22V12M20 16.5v-9a2 2 0 0 0-1-1.7l-6-3.5a2 2 0 0 0-2 0l-6 3.5a2 2 0 0 0-1 1.7v9a2 2 0 0 0 1 1.7l6 3.5a2 2 0 0 0 2 0l6-3.5a2 2 0 0 0 1-1.7Z"/>',
            }),
            this._tile({
                etiqueta: 'Entradas',
                valor: numero.format(kpis.entradas),
                pie: this._delta(kpis.entradas, kpis.entradas_anterior),
                icono: '<path d="M12 4v12m0 0-4-4m4 4 4-4M5 20h14"/>',
                sparkline: this._sparkline(serie.map((p) => p.entradas), 'serie-1'),
            }),
            this._tile({
                etiqueta: 'Salidas',
                valor: numero.format(kpis.salidas),
                pie: this._delta(kpis.salidas, kpis.salidas_anterior),
                icono: '<path d="M12 20V8m0 0 4 4m-4-4-4 4M5 4h14"/>',
                sparkline: this._sparkline(serie.map((p) => p.salidas), 'serie-2'),
            }),
            this._tile({
                etiqueta: 'Cobertura estimada',
                valor: cobertura === null ? '—' : numero.format(cobertura),
                unidad: cobertura === null ? '' : 'días',
                pie: `<span class="text-texto-secundario">${cobertura === null
                    ? 'Sin salidas en el periodo para estimar'
                    : `Al ritmo actual de ${kpis.salidas_promedio_dia.toLocaleString('es-MX')} salidas por día`}</span>`,
                icono: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
            }),
        ].join('');
    }

    // ------------------------------------------------------------------
    // Actividad reciente
    // ------------------------------------------------------------------

    _pintarActividadReciente() {
        const lista = this.contenedor.querySelector('[data-actividad]');
        const actividad = this.datos.actividad_reciente || [];
        if (!actividad.length) {
            lista.innerHTML = '<li class="px-5 py-8 text-center text-sm text-texto-secundario">Sin operaciones registradas.</li>';
            return;
        }
        lista.innerHTML = actividad.map((a) => {
            const tipo = TIPOS_OPERACION[a.tipo_operacion] || TIPOS_OPERACION.edicion;
            return `
                <li class="flex items-center gap-3 px-5 py-3 hover:bg-fondo/60">
                    <span class="w-9 h-9 shrink-0 rounded-full flex items-center justify-center ${tipo.clase}" title="${tipo.etiqueta}">
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${tipo.icono}</svg>
                    </span>
                    <div class="min-w-0 flex-1">
                        <p class="text-sm truncate"><span class="font-medium">${escaparHtml(a.usuario_nombre)}</span> ${tipo.verbo} <span class="font-mono text-xs rounded bg-fondo border border-borde px-1.5 py-0.5">${escaparHtml(a.numero_serie)}</span></p>
                        <p class="text-xs text-texto-secundario truncate mt-0.5">${escaparHtml(a.coleccion_descripcion)} · ${escaparHtml(a.almacen_nombre)}</p>
                    </div>
                    <div class="text-right shrink-0">
                        <span class="hidden sm:inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${tipo.clase}">${tipo.etiqueta}</span>
                        <p class="text-xs text-texto-secundario mt-1" title="${escaparHtml(a.fecha_operacion)}">${tiempoRelativo(a.fecha_operacion)}</p>
                    </div>
                </li>
            `;
        }).join('');
    }

    // ------------------------------------------------------------------
    // Gráficas + vista de tabla
    // ------------------------------------------------------------------

    /**
     * Una definición por gráfica: su configuración de Chart.js y su tabla equivalente.
     * Colores: serie-1 = entradas/ingresos, serie-2 = salidas, serie-3 = ajustes (fijos,
     * nunca por rango); magnitud de una sola serie = acento; estados solo para el umbral.
     * Paleta validada (CVD/contraste) en claro y oscuro con el validador de dataviz.
     */
    _definiciones() {
        const d = this.datos;
        const etiquetaFecha = (iso) => (d.periodo.agrupacion === 'semana' ? `Sem. ${fechaCorta.format(aFecha(iso))}` : fechaCorta.format(aFecha(iso)));
        const colorStock = (c) => (Number(c.stock) === 0 ? token('estado-critico') : Number(c.stock) <= Number(c.umbral_stock_bajo) ? token('estado-alerta') : token('acento'));
        const estadoStock = (c) => (Number(c.stock) === 0 ? '⛔ Sin stock' : Number(c.stock) <= Number(c.umbral_stock_bajo) ? '⚠ En umbral' : '✓ Normal');
        const nombreColeccion = (c) => (this.filtros.almacen ? c.descripcion : `${c.descripcion} · ${c.nombre_almacen}`);

        return {
            movimientos: {
                grafico: () => ({
                    type: 'line',
                    data: {
                        labels: d.serie_movimientos.map((p) => etiquetaFecha(p.fecha)),
                        datasets: [
                            this._linea('Entradas', d.serie_movimientos.map((p) => p.entradas), token('serie-1')),
                            this._linea('Salidas', d.serie_movimientos.map((p) => p.salidas), token('serie-2')),
                        ],
                    },
                    options: this._opciones({ interaccionIndice: true, ejeXTicks: { maxTicksLimit: 8, maxRotation: 0 } }),
                }),
                tabla: () => this._tabla(['Fecha', 'Entradas', 'Salidas'], d.serie_movimientos.map((p) => [etiquetaFecha(p.fecha), p.entradas, p.salidas])),
            },
            stockAlmacen: {
                grafico: () => ({
                    type: 'bar',
                    data: {
                        labels: d.stock_por_almacen.map((a) => a.nombre_almacen),
                        datasets: [this._barra('Stock', d.stock_por_almacen.map((a) => Number(a.stock_total)), token('acento'))],
                    },
                    options: this._opciones({ horizontal: true }),
                }),
                tabla: () => this._tabla(['Almacén', 'Stock'], d.stock_por_almacen.map((a) => [a.nombre_almacen, Number(a.stock_total)])),
                vacio: () => !d.stock_por_almacen.length && 'Sin colecciones en este recorte.',
            },
            stockColeccion: {
                grafico: () => ({
                    type: 'bar',
                    data: {
                        labels: d.stock_por_coleccion.map(nombreColeccion),
                        datasets: [{
                            ...this._barra('Stock', d.stock_por_coleccion.map((c) => Number(c.stock)), d.stock_por_coleccion.map(colorStock)),
                            umbrales: d.stock_por_coleccion.map((c) => Number(c.umbral_stock_bajo)),
                        }],
                    },
                    options: this._opciones({
                        horizontal: true,
                        tooltipExtra: (i) => [`Umbral: ${d.stock_por_coleccion[i].umbral_stock_bajo}`, estadoStock(d.stock_por_coleccion[i])],
                    }),
                    plugins: [this._pluginUmbral()],
                }),
                tabla: () => this._tabla(['Colección', 'Almacén', 'Stock', 'Umbral', 'Estado'], d.stock_por_coleccion.map((c) => [c.descripcion, c.nombre_almacen, Number(c.stock), Number(c.umbral_stock_bajo), estadoStock(c)])),
                vacio: () => !d.stock_por_coleccion.length && 'Sin colecciones en este recorte.',
            },
            top: {
                grafico: () => ({
                    type: 'bar',
                    data: {
                        labels: d.top_salidas.map(nombreColeccion),
                        datasets: [this._barra('Salidas', d.top_salidas.map((t) => Number(t.total_salidas)), token('serie-2'))],
                    },
                    options: this._opciones({ horizontal: true }),
                }),
                tabla: () => this._tabla(['Colección', 'Almacén', 'Salidas'], d.top_salidas.map((t) => [t.descripcion, t.nombre_almacen, Number(t.total_salidas)])),
                vacio: () => !d.top_salidas.length && 'Sin salidas en el periodo seleccionado.',
            },
            movAlmacen: {
                grafico: () => ({
                    type: 'bar',
                    data: {
                        labels: d.movimientos_por_almacen.map((a) => a.nombre_almacen),
                        datasets: [
                            this._barra('Entradas', d.movimientos_por_almacen.map((a) => Number(a.entradas)), token('serie-1')),
                            this._barra('Salidas', d.movimientos_por_almacen.map((a) => Number(a.salidas)), token('serie-2')),
                        ],
                    },
                    options: this._opciones({ interaccionIndice: true }),
                }),
                tabla: () => this._tabla(['Almacén', 'Entradas', 'Salidas'], d.movimientos_por_almacen.map((a) => [a.nombre_almacen, Number(a.entradas), Number(a.salidas)])),
                vacio: () => !d.movimientos_por_almacen.length && 'Sin movimientos en este recorte.',
            },
            equipo: {
                grafico: () => ({
                    type: 'bar',
                    data: {
                        labels: d.actividad_usuarios.map((u) => u.nombre),
                        datasets: [
                            this._barra('Ingresos', d.actividad_usuarios.map((u) => Number(u.ingresos)), token('serie-1'), true),
                            this._barra('Salidas', d.actividad_usuarios.map((u) => Number(u.salidas)), token('serie-2'), true),
                            this._barra('Ajustes', d.actividad_usuarios.map((u) => Number(u.ajustes)), token('serie-3'), true),
                        ],
                    },
                    options: this._opciones({ horizontal: true, apilado: true, interaccionIndice: true }),
                }),
                tabla: () => this._tabla(['Usuario', 'Ingresos', 'Salidas', 'Ajustes', 'Total'], d.actividad_usuarios.map((u) => [u.nombre, Number(u.ingresos), Number(u.salidas), Number(u.ajustes), Number(u.total)])),
                vacio: () => !d.actividad_usuarios.length && 'Sin operaciones en el periodo seleccionado.',
            },
        };
    }

    _linea(etiqueta, datos, color) {
        return {
            label: etiqueta,
            data: datos,
            borderColor: color,
            backgroundColor: color,
            borderWidth: 2,
            cubicInterpolationMode: 'monotone',
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBorderWidth: 2,
            pointHoverBorderColor: token('superficie'),
            borderCapStyle: 'round',
            borderJoinStyle: 'round',
        };
    }

    _barra(etiqueta, datos, color, apilada = false) {
        return {
            label: etiqueta,
            data: datos,
            backgroundColor: color,
            hoverBackgroundColor: color,
            // Extremo de datos redondeado (4px), base recta; en las apiladas, separación de 2px con el color de la superficie.
            borderRadius: apilada ? 0 : 4,
            borderSkipped: 'start',
            borderColor: token('superficie'),
            borderWidth: apilada ? { right: 2 } : 0,
            maxBarThickness: 24,
            categoryPercentage: 0.7,
            barPercentage: 0.85,
        };
    }

    _opciones({ horizontal = false, apilado = false, interaccionIndice = false, tooltipExtra = null, ejeXTicks = {} } = {}) {
        const texto = token('texto-secundario');
        const ejeValor = {
            beginAtZero: true,
            stacked: apilado,
            grid: { color: token('grafico-rejilla'), drawTicks: false },
            border: { display: false },
            ticks: { color: texto, padding: 8, precision: 0, maxTicksLimit: 6 },
        };
        // Las etiquetas largas se recortan según el ancho disponible (el texto completo queda en el tooltip y la tabla).
        const recortar = function (valor) {
            const etiqueta = this.getLabelForValue(valor);
            const maximo = this.chart.width < 420 ? 14 : 28;
            return etiqueta.length > maximo ? `${etiqueta.slice(0, maximo - 1)}…` : etiqueta;
        };
        const ejeCategoria = {
            stacked: apilado,
            grid: { display: false },
            border: { color: token('grafico-eje') },
            ticks: { color: texto, padding: 6, autoSkip: true, ...(horizontal ? { callback: recortar } : ejeXTicks) },
        };

        return {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 300 },
            indexAxis: horizontal ? 'y' : 'x',
            interaction: interaccionIndice ? { mode: 'index', intersect: false, axis: horizontal ? 'y' : 'x' } : { mode: 'nearest', intersect: true },
            layout: { padding: { right: horizontal ? 8 : 0 } },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: token('superficie'),
                    titleColor: token('texto'),
                    bodyColor: token('texto'),
                    footerColor: token('texto-secundario'),
                    borderColor: token('borde'),
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 10,
                    boxPadding: 4,
                    usePointStyle: true,
                    callbacks: tooltipExtra ? { afterBody: (items) => tooltipExtra(items[0].dataIndex) } : {},
                },
            },
            scales: horizontal ? { x: ejeValor, y: ejeCategoria } : { x: ejeCategoria, y: ejeValor },
        };
    }

    /** Dibuja una marca vertical en el valor de umbral de cada barra (gráfica de stock por colección). */
    _pluginUmbral() {
        return {
            id: 'marcaUmbral',
            afterDatasetsDraw(grafico) {
                const conjunto = grafico.data.datasets[0];
                const meta = grafico.getDatasetMeta(0);
                const { ctx, scales: { x } } = grafico;
                ctx.save();
                ctx.strokeStyle = token('texto');
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                meta.data.forEach((barra, i) => {
                    const posicion = x.getPixelForValue(conjunto.umbrales[i]);
                    const mitad = Math.max(barra.height / 2 + 3, 7);
                    ctx.beginPath();
                    ctx.moveTo(posicion, barra.y - mitad);
                    ctx.lineTo(posicion, barra.y + mitad);
                    ctx.stroke();
                });
                ctx.restore();
            },
        };
    }

    _tabla(encabezados, filas) {
        if (!filas.length) return '<p class="px-1 py-6 text-center text-sm text-texto-secundario">Sin datos para mostrar.</p>';
        return `
            <table class="w-full text-sm">
                <thead>
                    <tr class="text-left text-xs uppercase tracking-wide text-texto-secundario border-b border-borde">
                        ${encabezados.map((e, i) => `<th class="px-3 py-2 font-medium ${i ? 'text-right' : ''}">${e}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${filas.map((fila) => `<tr class="border-b border-borde last:border-0">${fila.map((celda, i) => `<td class="px-3 py-2 ${i ? 'text-right' : ''}">${escaparHtml(typeof celda === 'number' ? numero.format(celda) : celda)}</td>`).join('')}</tr>`).join('')}
                </tbody>
            </table>
        `;
    }

    _enlazarTablas() {
        this.contenedor.querySelectorAll('[data-alternar-tabla]').forEach((boton) => {
            const clave = boton.dataset.alternarTabla;
            boton.addEventListener('click', () => this._alternarTabla(clave, !this.vistaTabla.has(clave)));
            if (this.vistaTabla.has(clave)) this._alternarTabla(clave, true);
        });
    }

    _alternarTabla(clave, mostrarTabla) {
        const definicion = this._definiciones()[clave];
        const tabla = this.contenedor.querySelector(`[data-tabla="${clave}"]`);
        const grafico = this.contenedor.querySelector(`[data-grafico-contenedor="${clave}"]`);
        const boton = this.contenedor.querySelector(`[data-alternar-tabla="${clave}"]`);
        if (!definicion || !tabla || !grafico) return;

        mostrarTabla ? this.vistaTabla.add(clave) : this.vistaTabla.delete(clave);
        if (mostrarTabla) tabla.innerHTML = definicion.tabla();
        tabla.classList.toggle('hidden', !mostrarTabla);
        grafico.classList.toggle('hidden', mostrarTabla);
        boton.setAttribute('aria-pressed', String(mostrarTabla));
        boton.classList.toggle('bg-acento-suave', mostrarTabla);
        boton.classList.toggle('text-acento-texto', mostrarTabla);
        boton.querySelector('span').textContent = mostrarTabla ? 'Gráfica' : 'Tabla';
    }

    _pintarGraficos() {
        if (!window.Chart || !this.datos) return;
        window.Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
        window.Chart.defaults.font.size = 12;

        Object.entries(this._definiciones()).forEach(([clave, definicion]) => {
            this.graficos[clave]?.destroy();
            delete this.graficos[clave];

            const contenedor = this.contenedor.querySelector(`[data-grafico-contenedor="${clave}"]`);
            if (!contenedor) return;

            const mensajeVacio = definicion.vacio?.();
            contenedor.querySelector('[data-vacio]')?.remove();
            const canvas = contenedor.querySelector('canvas');
            canvas.classList.toggle('hidden', Boolean(mensajeVacio));
            if (mensajeVacio) {
                contenedor.insertAdjacentHTML('beforeend', `<p data-vacio class="absolute inset-0 flex items-center justify-center text-sm text-texto-secundario">${mensajeVacio}</p>`);
                return;
            }
            this.graficos[clave] = new window.Chart(canvas, definicion.grafico());
        });
    }

    destruir() {
        this.observadorTema?.disconnect();
        Object.values(this.graficos).forEach((grafico) => grafico.destroy());
        this.graficos = {};
    }
}
