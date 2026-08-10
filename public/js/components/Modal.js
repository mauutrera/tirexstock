/**
 * Modal genérico: fondo semitransparente, tarjeta centrada con esquinas
 * redondeadas y sombra pronunciada (3.4). El contenido lo decide quien
 * instancia el modal (formularios de alta/edición, confirmaciones, etc.).
 */
export default class Modal {
    constructor({ titulo, contenidoHtml, onMontar, ancho = 'max-w-lg' }) {
        this.titulo = titulo;
        this.contenidoHtml = contenidoHtml;
        this.onMontar = onMontar;
        this.ancho = ancho;
        this.elemento = null;
    }

    abrir() {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4';
        overlay.innerHTML = `
            <div class="w-full ${this.ancho} rounded-xl bg-superficie shadow-2xl">
                <div class="flex items-center justify-between border-b border-borde px-5 py-4">
                    <h2 class="text-base font-semibold">${this.titulo}</h2>
                    <button type="button" data-cerrar-modal class="rounded-lg p-1 text-texto-secundario hover:bg-fondo" aria-label="Cerrar">
                        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                </div>
                <div class="px-5 py-4 max-h-[75vh] overflow-y-auto">${this.contenidoHtml}</div>
            </div>
        `;

        overlay.addEventListener('click', (evento) => {
            if (evento.target === overlay || evento.target.closest('[data-cerrar-modal]')) {
                this.cerrar();
            }
        });
        document.addEventListener('keydown', this._escuchaEsc = (e) => {
            if (e.key === 'Escape') this.cerrar();
        });

        document.body.appendChild(overlay);
        this.elemento = overlay;

        if (typeof this.onMontar === 'function') {
            this.onMontar(overlay, this);
        }

        return this;
    }

    cerrar() {
        this.elemento?.remove();
        document.removeEventListener('keydown', this._escuchaEsc);
    }

    static confirmar({ titulo = 'Confirmar', mensaje, textoConfirmar = 'Confirmar', peligro = true }) {
        return new Promise((resolver) => {
            const modal = new Modal({
                titulo,
                ancho: 'max-w-sm',
                contenidoHtml: `
                    <p class="text-sm text-texto-secundario">${mensaje}</p>
                    <div class="mt-5 flex justify-end gap-2">
                        <button type="button" data-cancelar class="rounded-lg border border-borde px-3 py-2 text-sm font-medium hover:bg-fondo">Cancelar</button>
                        <button type="button" data-confirmar class="rounded-lg px-3 py-2 text-sm font-medium text-white ${peligro ? 'bg-red-600 hover:bg-red-700' : 'bg-acento hover:opacity-90'}">${textoConfirmar}</button>
                    </div>
                `,
                onMontar: (overlay) => {
                    overlay.querySelector('[data-cancelar]').addEventListener('click', () => {
                        modal.cerrar();
                        resolver(false);
                    });
                    overlay.querySelector('[data-confirmar]').addEventListener('click', () => {
                        modal.cerrar();
                        resolver(true);
                    });
                },
            });
            modal.abrir();
        });
    }
}
