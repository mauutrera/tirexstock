const CACHE_ESTATICA = 'inventariocol-estatica-v12';
const CACHE_API = 'inventariocol-api-v1';

const ASSETS_PRECARGA = [
    '/manifest.json',
    '/favicon.ico',
    '/css/tailwind.css',
    '/img/icon.svg',
    '/js/core/App.js',
    '/js/core/ApiClient.js',
    '/js/core/Router.js',
    '/js/core/ThemeManager.js',
    '/js/core/Utilidades.js',
    '/js/core/PermisosCliente.js',
    '/js/components/DataTable.js',
    '/js/components/FilterBar.js',
    '/js/components/Modal.js',
    '/js/components/Toast.js',
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
    // `no-cache` obliga a revalidar con el servidor (ETag): sin esto, la caché
    // HTTP heurística del navegador puede devolver un módulo JS viejo mezclado
    // con módulos nuevos, aunque la petición pase por la red.
    evento.respondWith(
        fetch(request, { cache: 'no-cache' })
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
