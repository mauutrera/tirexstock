/**
 * Notificaciones flotantes de corta duración (éxito/error/info).
 */
export default class Toast {
    constructor(contenedor) {
        this.contenedor = contenedor;
    }

    mostrar(mensaje, tipo = 'info', duracionMs = 4000) {
        const estilos = {
            exito: 'bg-emerald-600 text-white',
            error: 'bg-red-600 text-white',
            info: 'bg-texto text-fondo',
        };

        const div = document.createElement('div');
        div.className = `${estilos[tipo] || estilos.info} rounded-lg px-4 py-3 text-sm shadow-lg transition-opacity duration-300 opacity-0`;
        div.textContent = mensaje;
        this.contenedor.appendChild(div);

        requestAnimationFrame(() => div.classList.remove('opacity-0'));

        setTimeout(() => {
            div.classList.add('opacity-0');
            setTimeout(() => div.remove(), 300);
        }, duracionMs);
    }

    exito(mensaje) {
        this.mostrar(mensaje, 'exito');
    }

    error(mensaje) {
        this.mostrar(mensaje, 'error');
    }

    info(mensaje) {
        this.mostrar(mensaje, 'info');
    }
}
