/**
 * Alterna modo oscuro/claro (global, sin mezclas) y persiste la preferencia
 * por usuario en el backend además de localStorage (respaldo offline).
 */
export default class ThemeManager {
    constructor(apiClient) {
        this.apiClient = apiClient;
    }

    actual() {
        return document.documentElement.classList.contains('dark') ? 'oscuro' : 'claro';
    }

    aplicar(tema) {
        document.documentElement.classList.toggle('dark', tema === 'oscuro');
        localStorage.setItem('inventariocol_tema', tema);
    }

    async alternar() {
        const nuevo = this.actual() === 'oscuro' ? 'claro' : 'oscuro';
        this.aplicar(nuevo);
        try {
            await this.apiClient.post('/api/auth?accion=tema', { tema: nuevo });
        } catch {
            // La preferencia local ya quedó aplicada; no es crítico si falla el guardado remoto.
        }
    }
}
