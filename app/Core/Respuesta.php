<?php

namespace App\Core;

/**
 * Helpers de salida para los endpoints de app/Api — JSON consistente y
 * exportación CSV (usada como "Exportar a Excel" en todas las vistas).
 */
class Respuesta
{
    public static function json(array $datos, int $codigo = 200): never
    {
        http_response_code($codigo);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($datos, JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function error(string $mensaje, int $codigo = 400): never
    {
        self::json(['error' => $mensaje], $codigo);
    }

    /**
     * @param string[] $encabezados
     * @param iterable<array<int, mixed>> $filas
     */
    public static function csv(string $nombreArchivo, array $encabezados, iterable $filas): never
    {
        http_response_code(200);
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $nombreArchivo . '"');

        $salida = fopen('php://output', 'w');
        fwrite($salida, "\xEF\xBB\xBF"); // BOM UTF-8 para que Excel detecte el acento correctamente.
        fputcsv($salida, $encabezados);

        foreach ($filas as $fila) {
            fputcsv($salida, $fila);
        }

        fclose($salida);
        exit;
    }
}
