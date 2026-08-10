/**
 * Wrapper sobre fetch para hablar con app/Api/*.php: agrega el token CSRF
 * en mutaciones, homogeniza errores y redirige a /login en 401.
 */
export default class ApiClient {
    constructor(csrfToken) {
        this.csrfToken = csrfToken;
    }

    async solicitar(ruta, opciones = {}) {
        const metodo = opciones.method || 'GET';
        const headers = { 'Content-Type': 'application/json', ...(opciones.headers || {}) };
        if (metodo !== 'GET') {
            headers['X-CSRF-Token'] = this.csrfToken;
        }

        const respuesta = await fetch(ruta, { ...opciones, method: metodo, headers, credentials: 'same-origin' });

        if (respuesta.status === 401) {
            window.location.href = '/login';
            return new Promise(() => {});
        }

        const tipoContenido = respuesta.headers.get('content-type') || '';
        if (tipoContenido.includes('text/csv')) {
            return respuesta.blob();
        }

        const datos = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok) {
            const error = new Error(datos.error || `Error ${respuesta.status}`);
            error.status = respuesta.status;
            error.datos = datos;
            throw error;
        }

        return datos;
    }

    get(ruta) {
        return this.solicitar(ruta);
    }

    post(ruta, cuerpo = {}) {
        return this.solicitar(ruta, { method: 'POST', body: JSON.stringify(cuerpo) });
    }

    put(ruta, cuerpo = {}) {
        return this.solicitar(ruta, { method: 'PUT', body: JSON.stringify(cuerpo) });
    }

    eliminar(ruta) {
        return this.solicitar(ruta, { method: 'DELETE' });
    }

    /** Dispara la descarga de un archivo (usado por los botones "Exportar a Excel"). */
    async descargar(ruta, nombreSugerido = 'exportacion.csv') {
        const respuesta = await fetch(ruta, { credentials: 'same-origin' });
        if (!respuesta.ok) {
            throw new Error('No se pudo generar el archivo.');
        }
        const disposicion = respuesta.headers.get('content-disposition') || '';
        const coincidencia = disposicion.match(/filename="?([^"]+)"?/);
        const nombreArchivo = coincidencia ? coincidencia[1] : nombreSugerido;

        const blob = await respuesta.blob();
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = nombreArchivo;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        URL.revokeObjectURL(url);
    }
}
