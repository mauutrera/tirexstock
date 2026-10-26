import DataTable from '../components/DataTable.js';
import Modal from '../components/Modal.js';
import { escaparHtml } from '../core/Utilidades.js';

const CLAVES_VISTA = [
    ['vista_entradas', 'Ver Entradas'],
    ['vista_salidas', 'Ver Salidas'],
    ['vista_inventario', 'Ver Inventario'],
    ['vista_historial', 'Ver Historial'],
];
const CLAVES_ACCION = [
    ['accion_agregar_entrada', 'Agregar entradas'],
    ['accion_eliminar_entrada', 'Eliminar entradas'],
    ['accion_marcar_salida', 'Marcar salidas'],
    ['accion_desmarcar_salida', 'Desmarcar salidas'],
];

/** Jerarquía de roles (4.1): debe reflejar exactamente Permisos::puedeGestionarRol() en el backend. */
const NIVEL_ROL = { super_admin: 4, admin_general: 3, admin_almacen: 2, usuario_normal: 1 };
const ETIQUETAS_ROL = {
    super_admin: 'Super Admin',
    admin_general: 'Administrador General',
    admin_almacen: 'Administrador por Almacén',
    usuario_normal: 'Usuario Normal',
};

function puedeGestionarRol(rolActor, rolObjetivo) {
    if (rolActor === 'super_admin') return true;
    return (NIVEL_ROL[rolActor] || 0) > (NIVEL_ROL[rolObjetivo] || 0);
}

/** Administración de Usuarios (5.11), incluye configuración de permisos (4.2). */
export default class UsuariosAdminView {
    constructor({ api, usuario, toast, contenedor }) {
        this.api = api;
        this.usuarioSesion = usuario;
        this.toast = toast;
        this.contenedor = contenedor;
        this.esSuperAdmin = usuario.rol === 'super_admin';
        this.rolesGestionables = Object.keys(NIVEL_ROL).filter((rol) => puedeGestionarRol(usuario.rol, rol));
    }

    async render() {
        this.almacenes = (await this.api.get('/api/almacenes')).datos || [];

        this.contenedor.innerHTML = `
            <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h1 class="text-2xl font-semibold">Administración de Usuarios</h1>
                <button type="button" data-agregar class="rounded-lg bg-acento px-4 py-2 text-sm font-medium text-white hover:opacity-90">Agregar Nuevo Usuario</button>
            </div>
            <div data-tabla></div>
        `;
        this.contenedor.querySelector('[data-agregar]').addEventListener('click', () => this._abrirFormulario());

        this.tabla = new DataTable({
            contenedor: this.contenedor.querySelector('[data-tabla]'),
            columnas: [
                { clave: 'nombre', etiqueta: 'Nombre', filtro: { tipo: 'texto' } },
                { clave: 'departamento', etiqueta: 'Departamento' },
                { clave: 'rol', etiqueta: 'Rol' },
                { clave: 'almacenes', etiqueta: 'Almacén(es) Asignado(s)', formato: (v) => escaparHtml((v || []).map((a) => a.nombre).join(', ')) },
            ],
            acciones: [
                { etiqueta: 'Editar', visible: (fila) => fila.puede_gestionar, onClick: (fila) => this._abrirFormulario(fila) },
                {
                    etiqueta: 'Eliminar',
                    claseCss: 'text-red-600 hover:bg-red-50',
                    visible: (fila) => fila.puede_gestionar,
                    onClick: (fila) => this._eliminar(fila),
                },
            ],
            cargarPagina: (pagina, filtros) => this.api.get(this._url(pagina, filtros)),
            exportar: (filtros) => this.api.descargar(this._url(1, filtros, true), 'usuarios.csv'),
            filaVacia: 'No hay usuarios registrados.',
        });
    }

    _url(pagina, filtros, exportar = false) {
        const params = new URLSearchParams({ page: pagina, ...filtros });
        if (exportar) params.set('export', 'csv');
        return `/api/usuarios?${params.toString()}`;
    }

    _abrirFormulario(usuario = null) {
        const rolesDisponibles = this.rolesGestionables.map((rol) => [rol, ETIQUETAS_ROL[rol]]);

        const idsAsignados = new Set((usuario?.almacenes || []).map((a) => a.id_almacen));

        const modal = new Modal({
            titulo: usuario ? 'Editar Usuario' : 'Agregar Nuevo Usuario',
            ancho: 'max-w-xl',
            contenidoHtml: `
                <form data-form class="space-y-4">
                    <div class="grid grid-cols-2 gap-3">
                        <label class="block text-sm">Nombre
                            <input type="text" name="nombre" required value="${escaparHtml(usuario?.nombre || '')}" class="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm">
                        </label>
                        <label class="block text-sm">Departamento
                            <input type="text" name="departamento" value="${escaparHtml(usuario?.departamento || '')}" class="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm">
                        </label>
                    </div>
                    <label class="block text-sm">Email
                        <input type="email" name="email" required value="${escaparHtml(usuario?.email || '')}" class="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm">
                    </label>
                    <label class="block text-sm">Contraseña ${usuario ? '(dejar en blanco para no cambiar)' : ''}
                        <input type="password" name="password" ${usuario ? '' : 'required'} class="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm">
                    </label>
                    <label class="block text-sm">Rol
                        <select name="rol" data-rol required class="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm">
                            ${rolesDisponibles.map(([v, e]) => `<option value="${v}" ${usuario?.rol === v ? 'selected' : ''}>${e}</option>`).join('')}
                        </select>
                    </label>
                    <fieldset>
                        <legend class="text-sm mb-1">Almacén(es) Asignado(s)</legend>
                        <div class="flex flex-wrap gap-3">
                            ${this.almacenes
                                .map(
                                    (a) => `
                                <label class="flex items-center gap-1.5 text-sm">
                                    <input type="checkbox" name="almacenes" value="${a.id_almacen}" ${idsAsignados.has(a.id_almacen) ? 'checked' : ''}>
                                    ${escaparHtml(a.nombre)}
                                </label>
                            `
                                )
                                .join('')}
                        </div>
                    </fieldset>
                    <fieldset data-permisos class="hidden border-t border-borde pt-3">
                        <legend class="text-sm font-medium mb-2">Permisos (Usuario Normal)</legend>
                        <div class="grid grid-cols-2 gap-2">
                            ${[...CLAVES_VISTA, ...CLAVES_ACCION]
                                .map(
                                    ([clave, etiqueta]) => `
                                <label class="flex items-center gap-1.5 text-sm">
                                    <input type="checkbox" name="permiso_${clave}" ${usuario?.permisos?.[clave] ? 'checked' : ''}>
                                    ${etiqueta}
                                </label>
                            `
                                )
                                .join('')}
                        </div>
                    </fieldset>
                    <div class="flex justify-end gap-2 pt-2">
                        <button type="button" data-cerrar-modal class="rounded-lg border border-borde px-3 py-2 text-sm font-medium hover:bg-fondo">Cancelar</button>
                        <button type="submit" class="rounded-lg bg-acento px-3 py-2 text-sm font-medium text-white hover:opacity-90">Guardar</button>
                    </div>
                </form>
            `,
            onMontar: (overlay) => {
                const selectRol = overlay.querySelector('[data-rol]');
                const bloquePermisos = overlay.querySelector('[data-permisos]');
                const actualizarVisibilidadPermisos = () => bloquePermisos.classList.toggle('hidden', selectRol.value !== 'usuario_normal');
                selectRol.addEventListener('change', actualizarVisibilidadPermisos);
                actualizarVisibilidadPermisos();

                overlay.querySelector('[data-form]').addEventListener('submit', async (evento) => {
                    evento.preventDefault();
                    const form = evento.target;
                    const formData = new FormData(form);

                    const payload = {
                        nombre: formData.get('nombre'),
                        email: formData.get('email'),
                        departamento: formData.get('departamento'),
                        rol: formData.get('rol'),
                        almacenes: formData.getAll('almacenes').map(Number),
                    };
                    const password = formData.get('password');
                    if (password) payload.password = password;

                    if (payload.rol === 'usuario_normal') {
                        payload.permisos = {};
                        [...CLAVES_VISTA, ...CLAVES_ACCION].forEach(([clave]) => {
                            payload.permisos[clave] = form.querySelector(`[name="permiso_${clave}"]`).checked;
                        });
                    }

                    try {
                        if (usuario) {
                            await this.api.put('/api/usuarios', { ...payload, id_usuario: usuario.id_usuario });
                        } else {
                            await this.api.post('/api/usuarios', payload);
                        }
                        this.toast.exito('Usuario guardado.');
                        modal.cerrar();
                        this.tabla.cargar();
                    } catch (error) {
                        this.toast.error(error.message || 'No se pudo guardar el usuario.');
                    }
                });
            },
        });
        modal.abrir();
    }

    async _eliminar(fila) {
        const confirmado = await Modal.confirmar({
            titulo: 'Eliminar usuario',
            mensaje: `¿Eliminar a "${fila.nombre}"? Esta acción no se puede deshacer.`,
            textoConfirmar: 'Eliminar',
        });
        if (!confirmado) return;

        try {
            await this.api.eliminar(`/api/usuarios?id_usuario=${fila.id_usuario}`);
            this.toast.exito('Usuario eliminado.');
            this.tabla.cargar();
        } catch (error) {
            this.toast.error(error.message || 'No se pudo eliminar el usuario.');
        }
    }
}
