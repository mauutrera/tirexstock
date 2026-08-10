<?php

namespace App\Core;

/**
 * Helpers pequeños y compartidos por todos los endpoints de app/Api: leer el
 * cuerpo JSON, resolver la página actual y exigir el token CSRF en
 * mutaciones (POST/PUT/DELETE), evitando repetir este boilerplate en cada
 * archivo.
 */
class Peticion
{
    public static function cuerpoJson(): array
    {
        $crudo = file_get_contents('php://input');
        if (!$crudo) {
            return [];
        }

        $datos = json_decode($crudo, true);

        return is_array($datos) ? $datos : [];
    }

    public static function pagina(): int
    {
        $pagina = (int) ($_GET['page'] ?? 1);

        return $pagina > 0 ? $pagina : 1;
    }

    public static function exigirCsrf(): void
    {
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? null;
        if (!Auth::validarCsrf($token)) {
            Respuesta::error('Token CSRF inválido o ausente.', 403);
        }
    }
}
