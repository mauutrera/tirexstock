import { escaparHtml } from '../core/Utilidades.js';

const ETIQUETAS_ROL = {
    super_admin: 'Super Admin',
    admin_general: 'Administrador General',
    admin_almacen: 'Administrador por Almacén',
    usuario_normal: 'Usuario Normal',
};

function iniciales(nombre) {
    return nombre
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((parte) => parte[0]?.toUpperCase() || '')
        .join('');
}

/** Mi Perfil: cualquier usuario autenticado edita sus propios datos y contraseña. */
export default class PerfilView {
    constructor({ api, toast, contenedor }) {
        this.api = api;
        this.toast = toast;
        this.contenedor = contenedor;
    }

    async render() {
        this.contenedor.innerHTML = `<p class="text-texto-secundario">Cargando…</p>`;

        try {
            this.usuario = (await this.api.get('/api/perfil')).usuario;
        } catch (error) {
            this.contenedor.innerHTML = `<p class="text-red-600">${escaparHtml(error.message || 'No se pudo cargar el perfil.')}</p>`;
            return;
        }

        const u = this.usuario;
        const almacenesTexto = (u.almacenes || []).map((a) => a.nombre).join(', ') || 'Todos los almacenes';

        this.contenedor.innerHTML = `
            <h1 class="text-2xl font-semibold mb-4">Mi Perfil</h1>

            <div class="max-w-2xl space-y-6">
                <div class="rounded-xl border border-borde bg-superficie p-5 flex items-center gap-4">
                    <div class="w-14 h-14 shrink-0 rounded-full bg-acento text-white flex items-center justify-center text-lg font-semibold">
                        ${escaparHtml(iniciales(u.nombre) || '?')}
                    </div>
                    <div class="min-w-0">
                        <p class="text-base font-semibold truncate">${escaparHtml(u.nombre)}</p>
                        <p class="text-sm text-texto-secundario truncate">${escaparHtml(u.email)}</p>
                        <span class="inline-block mt-1.5 rounded-full bg-fondo border border-borde px-2.5 py-0.5 text-xs font-medium text-texto-secundario">
                            ${escaparHtml(ETIQUETAS_ROL[u.rol] || u.rol)}
                        </span>
                    </div>
                </div>

                <div class="rounded-xl border border-borde bg-superficie p-5">
                    <div class="flex items-center gap-2 mb-4">
                        <svg class="w-5 h-5 text-texto-secundario" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>
                        <h2 class="text-sm font-semibold">Datos de Usuario</h2>
                    </div>
                    <form data-form-datos class="space-y-4">
                        <div class="grid sm:grid-cols-2 gap-4">
                            <label class="block text-sm">Nombre
                                <input type="text" name="nombre" required value="${escaparHtml(u.nombre)}" class="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-acento-texto">
                            </label>
                            <label class="block text-sm">Email
                                <input type="email" name="email" required value="${escaparHtml(u.email)}" class="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-acento-texto">
                            </label>
                        </div>

                        <dl class="grid sm:grid-cols-3 gap-3 rounded-lg bg-fondo border border-borde px-4 py-3 text-sm">
                            <div>
                                <dt class="text-xs text-texto-secundario">Departamento</dt>
                                <dd class="mt-0.5">${escaparHtml(u.departamento || '—')}</dd>
                            </div>
                            <div>
                                <dt class="text-xs text-texto-secundario">Rol</dt>
                                <dd class="mt-0.5">${escaparHtml(ETIQUETAS_ROL[u.rol] || u.rol)}</dd>
                            </div>
                            <div>
                                <dt class="text-xs text-texto-secundario">Almacén(es)</dt>
                                <dd class="mt-0.5">${escaparHtml(almacenesTexto)}</dd>
                            </div>
                        </dl>
                        <p class="text-xs text-texto-secundario -mt-2">Departamento, rol y almacenes son asignados por un administrador.</p>

                        <p data-error-datos class="text-sm text-red-600 hidden"></p>
                        <button type="submit" class="rounded-lg bg-acento px-4 py-2 text-sm font-medium text-white hover:opacity-90">Guardar Datos</button>
                    </form>
                </div>

                <div class="rounded-xl border border-borde bg-superficie p-5">
                    <div class="flex items-center gap-2 mb-4">
                        <svg class="w-5 h-5 text-texto-secundario" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
                        <h2 class="text-sm font-semibold">Seguridad</h2>
                    </div>
                    <form data-form-password class="space-y-4">
                        <label class="block text-sm">Contraseña Actual
                            <input type="password" name="password_actual" required autocomplete="current-password" class="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-acento-texto">
                        </label>
                        <div class="grid sm:grid-cols-2 gap-4">
                            <label class="block text-sm">Nueva Contraseña
                                <input type="password" name="password_nueva" required minlength="8" autocomplete="new-password" class="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-acento-texto">
                                <span class="text-xs text-texto-secundario">Mínimo 8 caracteres</span>
                            </label>
                            <label class="block text-sm">Confirmar Nueva Contraseña
                                <input type="password" name="password_confirmar" required minlength="8" autocomplete="new-password" class="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-acento-texto">
                            </label>
                        </div>
                        <p data-error-password class="text-sm text-red-600 hidden"></p>
                        <button type="submit" class="rounded-lg border border-borde px-4 py-2 text-sm font-medium hover:bg-fondo">Cambiar Contraseña</button>
                    </form>
                </div>
            </div>
        `;

        this._registrarFormularioDatos();
        this._registrarFormularioPassword();
    }

    _registrarFormularioDatos() {
        const form = this.contenedor.querySelector('[data-form-datos]');
        const errorEl = this.contenedor.querySelector('[data-error-datos]');

        form.addEventListener('submit', async (evento) => {
            evento.preventDefault();
            errorEl.classList.add('hidden');
            const datos = Object.fromEntries(new FormData(form).entries());

            try {
                await this.api.put('/api/perfil', { ...datos, departamento: this.usuario.departamento });
                this.toast.exito('Datos actualizados.');
                window.location.href = '/perfil';
            } catch (error) {
                errorEl.textContent = error.message || 'No se pudieron guardar los datos.';
                errorEl.classList.remove('hidden');
            }
        });
    }

    _registrarFormularioPassword() {
        const form = this.contenedor.querySelector('[data-form-password]');
        const errorEl = this.contenedor.querySelector('[data-error-password]');

        form.addEventListener('submit', async (evento) => {
            evento.preventDefault();
            errorEl.classList.add('hidden');
            const datos = Object.fromEntries(new FormData(form).entries());

            if (datos.password_nueva !== datos.password_confirmar) {
                errorEl.textContent = 'La confirmación no coincide con la nueva contraseña.';
                errorEl.classList.remove('hidden');
                return;
            }

            try {
                await this.api.put('/api/perfil', {
                    nombre: this.usuario.nombre,
                    email: this.usuario.email,
                    departamento: this.usuario.departamento,
                    password_actual: datos.password_actual,
                    password_nueva: datos.password_nueva,
                });
                this.toast.exito('Contraseña actualizada.');
                form.reset();
            } catch (error) {
                errorEl.textContent = error.message || 'No se pudo cambiar la contraseña.';
                errorEl.classList.remove('hidden');
            }
        });
    }
}
