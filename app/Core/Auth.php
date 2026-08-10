<?php

namespace App\Core;

use App\Models\Usuario;

/**
 * Autenticación y sesión. Nunca se confía en el frontend: cada vista y cada
 * endpoint de la API deben llamar a Auth::requerirSesion() (o su variante
 * JSON) antes de operar.
 */
class Auth
{
    public static function intentarLogin(string $email, string $password): bool
    {
        $usuario = Usuario::buscarPorEmail($email);

        if (!$usuario || !password_verify($password, $usuario['password_hash'])) {
            return false;
        }

        session_regenerate_id(true);

        $_SESSION['usuario_id'] = (int) $usuario['id_usuario'];
        $_SESSION['ultima_actividad'] = time();
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));

        return true;
    }

    public static function cerrarSesion(): void
    {
        $_SESSION = [];
        session_destroy();
    }

    public static function estaAutenticado(): bool
    {
        return !empty($_SESSION['usuario_id']);
    }

    /**
     * Usuario en sesión con sus almacenes asignados y permisos configurables.
     */
    public static function usuarioActual(): ?array
    {
        if (!self::estaAutenticado()) {
            return null;
        }

        $usuario = Usuario::buscarPorId((int) $_SESSION['usuario_id']);
        if (!$usuario) {
            return null;
        }

        unset($usuario['password_hash']);
        $usuario['almacenes'] = Usuario::almacenesAsignados((int) $usuario['id_usuario']);
        $usuario['permisos'] = Usuario::permisos((int) $usuario['id_usuario']);

        return $usuario;
    }

    public static function csrfToken(): string
    {
        if (empty($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }

        return $_SESSION['csrf_token'];
    }

    public static function validarCsrf(?string $token): bool
    {
        return !empty($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], (string) $token);
    }

    /**
     * Para rutas de vista (HTML): redirige a /login si no hay sesión.
     */
    public static function requerirSesion(): void
    {
        if (!self::estaAutenticado()) {
            header('Location: /login');
            exit;
        }
    }

    /**
     * Para endpoints /api/*: corta con 401 JSON si no hay sesión.
     */
    public static function requerirSesionApi(): array
    {
        $usuario = self::usuarioActual();
        if (!$usuario) {
            Respuesta::json(['error' => 'No autenticado'], 401);
        }

        return $usuario;
    }
}
