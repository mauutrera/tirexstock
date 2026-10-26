/**
 * Enrutador del lado del cliente: History API, sin recargas de navegador
 * entre vistas. Resuelve la ruta actual contra el mapa de vistas y monta la
 * clase correspondiente dentro de #app.
 */
export default class RouterCliente {
    constructor({ rutas, contexto, contenedor, alNavegar = null }) {
        this.rutas = rutas;
        this.contexto = contexto;
        this.contenedor = contenedor;
        this.alNavegar = alNavegar;
        this.vistaActual = null;
    }

    iniciar() {
        document.addEventListener('click', (evento) => this._interceptarClick(evento));
        window.addEventListener('popstate', () => this._resolver());
        this._resolver();
    }

    navegar(ruta) {
        if (ruta === window.location.pathname) return;
        history.pushState({}, '', ruta);
        this._resolver();
    }

    _interceptarClick(evento) {
        const enlace = evento.target.closest('a[data-link]');
        if (!enlace) return;
        const href = enlace.getAttribute('href') || '';
        if (href.startsWith('http') || href.startsWith('#')) return;
        evento.preventDefault();
        this.navegar(href);
    }

    async _resolver() {
        const ruta = window.location.pathname;
        const coincidencia = this._emparejar(ruta);
        this._marcarNavActivo(ruta);
        this.alNavegar?.();

        this.vistaActual?.destruir?.();
        this.contenedor.innerHTML = '';

        if (!coincidencia) {
            this.contenedor.innerHTML = '<p class="text-texto-secundario p-6">Vista no encontrada.</p>';
            return;
        }

        const { definicion, params } = coincidencia;
        this.vistaActual = new definicion.vista({ ...this.contexto, params, contenedor: this.contenedor });
        await this.vistaActual.render();
    }

    _emparejar(ruta) {
        const segmentosRuta = ruta.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);

        for (const definicion of this.rutas) {
            const segmentosPatron = definicion.patron.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
            if (segmentosPatron.length !== segmentosRuta.length) continue;

            const params = {};
            let coincide = true;
            segmentosPatron.forEach((segmento, indice) => {
                if (segmento.startsWith(':')) {
                    params[segmento.slice(1)] = segmentosRuta[indice];
                } else if (segmento !== segmentosRuta[indice]) {
                    coincide = false;
                }
            });

            if (coincide) return { definicion, params };
        }

        return null;
    }

    _marcarNavActivo(ruta) {
        const primerSegmento = '/' + (ruta.replace(/^\/+|\/+$/g, '').split('/')[0] || '');
        document.querySelectorAll('.nav-link').forEach((enlace) => {
            const activo = enlace.getAttribute('href') === primerSegmento;
            enlace.classList.toggle('bg-acento-suave', activo);
            enlace.classList.toggle('text-acento-texto', activo);
            enlace.classList.toggle('font-semibold', activo);
            enlace.classList.toggle('text-texto-secundario', !activo);
        });
        document.getElementById('sidebar')?.classList.add('hidden');
    }
}
