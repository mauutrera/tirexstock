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
import NotificacionesView from '../views/NotificacionesView.js';
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
    }

    /**
     * Contador de notificaciones (alertas de stock bajo) en la campana y el menú lateral.
     * Se refresca en cada navegación, ya que entradas/salidas cambian el stock.
     */
    async _actualizarContadorNotificaciones() {
        if (!esAdmin(this.usuario)) return;
        try {
            const datos = await this.api.get('/api/notificaciones');
            const total = datos.alertas_stock_bajo?.length || 0;
            document.querySelectorAll('[data-contador-notificaciones]').forEach((contador) => {
                contador.textContent = total > 99 ? '99+' : String(total);
                contador.classList.toggle('hidden', total === 0);
            });
        } catch {
            // Silencioso: no bloquear la navegación por esto.
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
            { patron: '/notificaciones', vista: NotificacionesView },
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

        new RouterCliente({
            rutas,
            contexto,
            contenedor: this.contenedor,
            alNavegar: () => this._actualizarContadorNotificaciones(),
        }).iniciar();
    }

    _registrarServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/service-worker.js').catch(() => {});
        }
    }
}

new App();
