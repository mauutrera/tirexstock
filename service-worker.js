const CACHE_ESTATICA = 'inventariocol-estatica-v3';
const CACHE_API = 'inventariocol-api-v1';

const ASSETS_PRECARGA = [
    '/manifest.json',
    '/public/css/tailwind.css',
    '/public/icons/icon.svg',
    '/public/js/core/App.js',
    '/public/js/core/ApiClient.js',
    '/public/js/core/Router.js',
    '/public/js/core/ThemeManager.js',
    '/public/js/core/Utilidades.js',
    '/public/js/core/PermisosCliente.js',
    '/public/js/components/DataTable.js',
    '/public/js/components/FilterBar.js',
    '/public/js/components/Modal.js',
    '/public/js/components/Toast.js',
];

self.addEventListener('install', (evento) => {
    evento.waitUntil(
        caches.open(CACHE_ESTATICA)
            .then((cache) => cache.addAll(ASSETS_PRECARGA))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (evento) => {
    evento.waitUntil(
        caches.keys().then((claves) =>
            Promise.all(
                claves
                    .filter((clave) => ![CACHE_ESTATICA, CACHE_API].includes(clave))
                    .map((clave) => caches.delete(clave))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (evento) => {
    const { request } = evento;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Documentos HTML (navegación): SIEMPRE red, nunca caché. La página
    // incrusta datos de sesión (token CSRF, usuario) que cambian con cada
    // login/logout — servir una copia cacheada desataría un token CSRF
    // desincronizado del que tiene el servidor ("Token CSRF inválido").
    if (request.mode === 'navigate') {
        evento.respondWith(fetch(request));
        return;
    }

    // /api/*: network-first, con caché como respaldo básico offline.
    if (url.pathname.startsWith('/api/')) {
        evento.respondWith(
            fetch(request)
                .then((respuesta) => {
                    const copia = respuesta.clone();
                    caches.open(CACHE_API).then((cache) => cache.put(request, copia));
                    return respuesta;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    // Assets estáticos (JS/CSS/íconos): también red primero. Con cache-first
    // aquí, un archivo cacheado antes de un cambio de código (p. ej. una
    // ruta nueva agregada a App.js) sigue sirviéndose obsoleto indefinidamente
    // hasta que algo más invalide la caché — network-first evita esa clase
    // de bug y solo cae a caché cuando de verdad no hay red (offline).
    evento.respondWith(
        fetch(request)
            .then((respuesta) => {
                if (respuesta.ok) {
                    const copia = respuesta.clone();
                    caches.open(CACHE_ESTATICA).then((cache) => cache.put(request, copia));
                }
                return respuesta;
            })
            .catch(() => caches.match(request))
    );
});
