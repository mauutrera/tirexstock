import { escaparHtml } from '../core/Utilidades.js';

export default class LoginView {
    constructor({ api, toast, contenedor }) {
        this.api = api;
        this.toast = toast;
        this.contenedor = contenedor;
    }

    render() {
        this.contenedor.innerHTML = `
            <div class="w-full max-w-sm tarjeta p-8 shadow-flotante">
                <div class="mx-auto mb-4 w-14 h-14 rounded-2xl bg-acento-suave flex items-center justify-center">
                    <img src="/img/icon.svg" alt="" class="w-9 h-9">
                </div>
                <h1 class="text-3xl font-extrabold tracking-tight text-center">Tirex<span class="text-acento-texto">Stock</span></h1>
                <p class="text-xs uppercase tracking-wide text-texto-secundario text-center mt-1">Inventario de llantas por colecciones</p>
                <p class="text-sm text-texto-secundario text-center mt-4 mb-6">Inicia sesión para continuar</p>
                <form data-form-login class="space-y-4">
                    <label class="block text-sm">
                        Email
                        <input type="email" name="email" required autocomplete="username"
                               class="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm text-texto">
                    </label>
                    <label class="block text-sm">
                        Contraseña
                        <input type="password" name="password" required autocomplete="current-password"
                               class="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm text-texto">
                    </label>
                    <p data-error class="text-sm text-red-600 hidden"></p>
                    <button type="submit" class="w-full rounded-xl bg-acento px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90">
                        Ingresar
                    </button>
                </form>
            </div>
        `;

        const form = this.contenedor.querySelector('[data-form-login]');
        const errorEl = this.contenedor.querySelector('[data-error]');

        form.addEventListener('submit', async (evento) => {
            evento.preventDefault();
            errorEl.classList.add('hidden');
            const datos = Object.fromEntries(new FormData(form).entries());

            try {
                const respuesta = await this.api.post('/api/auth', datos);
                window.location.href = '/' + respuesta.ruta_inicial;
            } catch (error) {
                errorEl.textContent = escaparHtml(error.message || 'No se pudo iniciar sesión.');
                errorEl.classList.remove('hidden');
            }
        });
    }
}
