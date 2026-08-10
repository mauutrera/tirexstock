import ApiClient from './ApiClient.js';
import ThemeManager from './ThemeManager.js';
import RouterCliente from './Router.js';
import Toast from '../components/Toast.js';
import LoginView from '../views/LoginView.js';
import DashboardView from '../views/DashboardView.js';
import EntradasView from '../views/EntradasView.js';
import SalidasView from '../views/SalidasView.js';
import InventarioView from '../views/InventarioView.js';
import DetalleColeccionView from '../views/DetalleColeccionView.js';
import HistorialView from '../views/HistorialView.js';
import ReportesView from '../views/ReportesView.js';
import ColeccionesAdminView from '../views/ColeccionesAdminView.js';
import AlmacenesAdminView from '../views/AlmacenesAdminView.js';
import UsuariosAdminView from '../views/UsuariosAdminView.js';
import PerfilView from '../views/PerfilView.js';
import { esAdmin } from './PermisosCliente.js';

/** Clase principal: inicializa la SPA (sesión, tema, router). */
class App {
    constructor() {
        this.bootstrap = window.__BOOTSTRAP__ || {};
        this.api = new ApiClient(this.bootstrap.csrfToken);
        this.toast = new Toast(document.getElementById('toasts'));
        this.tema = new ThemeManager(this.api);
        this.usuario = this.bootstrap.usuario;
        this.contenedor = document.getElementById('app');

        if (!this.bootstrap.autenticado) {
            new LoginView({ api: this.api, toast: this.toast, contenedor: this.contenedor }).render();
            return;
        }

        this._registrarEventosGlobales();
        this._iniciarRouter();
        this._registrarServiceWorker();
        this._notificarAlertasStockBajo();
    }

    /** Notificaciones de alertas de stock bajo, cargadas al abrir la app (5.1). */
    async _notificarAlertasStockBajo() {
        if (!esAdmin(this.usuario)) return;
        try {
            const datos = await this.api.get('/api/dashboard');
            const total = datos.alertas_stock_bajo?.length || 0;
            if (total > 0) {
                this.toast.info(`Hay ${total} colección(es) con stock bajo el umbral configurado.`);
            }
        } catch {
            // Silencioso: no bloquear el arranque de la app por esto.
        }
    }

    _registrarEventosGlobales() {
        document.getElementById('boton-tema')?.addEventListener('click', () => this.tema.alternar());
        document.getElementById('boton-logout')?.addEventListener('click', () => this._cerrarSesion());
        document.getElementById('boton-menu-movil')?.addEventListener('click', () => {
            document.getElementById('sidebar')?.classList.toggle('hidden');
        });
        this._registrarMenuSesion();
    }

    /** Menú desplegable de sesión (avatar/nombre → Mi Perfil / Cerrar Sesión). */
    _registrarMenuSesion() {
        const boton = document.getElementById('boton-menu-sesion');
        const menu = document.getElementById('menu-sesion');
        if (!boton || !menu) return;

        const cerrar = () => {
            menu.classList.add('hidden');
            boton.setAttribute('aria-expanded', 'false');
        };
        const abrir = () => {
            menu.classList.remove('hidden');
            boton.setAttribute('aria-expanded', 'true');
        };

        boton.addEventListener('click', (evento) => {
            evento.stopPropagation();
            menu.classList.contains('hidden') ? abrir() : cerrar();
        });
        document.addEventListener('click', (evento) => {
            if (!menu.classList.contains('hidden') && !menu.contains(evento.target)) cerrar();
        });
        document.addEventListener('keydown', (evento) => {
            if (evento.key === 'Escape') cerrar();
        });
        menu.querySelectorAll('a[data-link]').forEach((enlace) => enlace.addEventListener('click', cerrar));
    }

    async _cerrarSesion() {
        try {
            await this.api.post('/api/auth?accion=logout');
        } catch {
            // Si la sesión ya expiró en el servidor, igual redirigimos.
        }
        window.location.href = '/login';
    }

    _iniciarRouter() {
        const contexto = { api: this.api, usuario: this.usuario, toast: this.toast };
        const rutas = [
            { patron: '/dashboard', vista: DashboardView },
            { patron: '/entradas', vista: EntradasView },
            { patron: '/salidas', vista: SalidasView },
            { patron: '/inventario', vista: InventarioView },
            { patron: '/inventario/coleccion/:id', vista: DetalleColeccionView },
            { patron: '/historial', vista: HistorialView },
            { patron: '/reportes', vista: ReportesView },
            { patron: '/colecciones', vista: ColeccionesAdminView },
            { patron: '/almacenes', vista: AlmacenesAdminView },
            { patron: '/usuarios', vista: UsuariosAdminView },
            { patron: '/perfil', vista: PerfilView },
        ];

        new RouterCliente({ rutas, contexto, contenedor: this.contenedor }).iniciar();
    }

    _registrarServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/service-worker.js').catch(() => {});
        }
    }
}

new App();
