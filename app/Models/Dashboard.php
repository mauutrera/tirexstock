<?php

namespace App\Models;

use App\Core\Database;
use PDO;

/**
 * Métricas del Dashboard. Todas comparten el mismo "recorte" (almacenes visibles
 * según el rol + almacén + conjunto artículo/tipo/medida opcionales), para que
 * los KPIs y todas las gráficas describan exactamente el mismo universo.
 *
 * Solo usa SQL portable (DATE(), COUNT, SUM, CASE) — funciona en SQLite y MySQL.
 */
class Dashboard
{
    /**
     * @param array{id_almacen?: ?int, item?: string, tipo?: string, medidas?: string} $filtros
     */
    public function __construct(private ?array $almacenesPermitidos, private array $filtros = [])
    {
    }

    /** Condiciones sobre la tabla de colecciones (alias c) para el recorte actual. */
    private function recorte(string $alias = 'c'): array
    {
        $condiciones = [];
        $parametros = [];

        if ($this->almacenesPermitidos !== null) {
            if ($this->almacenesPermitidos === []) {
                return [['1 = 0'], []];
            }
            $marcadores = [];
            foreach (array_values($this->almacenesPermitidos) as $i => $idAlmacen) {
                $marcadores[] = ":rec_almacen_$i";
                $parametros[":rec_almacen_$i"] = (int) $idAlmacen;
            }
            $condiciones[] = "$alias.id_almacen IN (" . implode(',', $marcadores) . ')';
        }
        if (!empty($this->filtros['id_almacen'])) {
            $condiciones[] = "$alias.id_almacen = :rec_id_almacen";
            $parametros[':rec_id_almacen'] = (int) $this->filtros['id_almacen'];
        }
        if (!empty($this->filtros['item']) && !empty($this->filtros['tipo']) && !empty($this->filtros['medidas'])) {
            $condiciones[] = "$alias.item = :rec_item AND $alias.tipo = :rec_tipo AND $alias.medidas = :rec_medidas";
            $parametros[':rec_item'] = $this->filtros['item'];
            $parametros[':rec_tipo'] = $this->filtros['tipo'];
            $parametros[':rec_medidas'] = $this->filtros['medidas'];
        }

        return [$condiciones, $parametros];
    }

    private function consultar(string $sql, array $parametros): array
    {
        $stmt = Database::conexion()->prepare($sql);
        $stmt->execute($parametros);

        return $stmt->fetchAll();
    }

    private static function where(array $condiciones): string
    {
        return $condiciones ? 'WHERE ' . implode(' AND ', $condiciones) : '';
    }

    /** Stock vigente por colección (con umbral), del más crítico al más holgado. */
    public function stockPorColeccion(): array
    {
        [$condiciones, $parametros] = $this->recorte('vw');

        return $this->consultar(
            'SELECT vw.id_coleccion, vw.descripcion, vw.id_almacen, vw.nombre_almacen, vw.stock, vw.umbral_stock_bajo
             FROM vw_stock_colecciones vw ' . self::where($condiciones) . '
             ORDER BY (vw.stock - vw.umbral_stock_bajo) ASC, vw.descripcion',
            $parametros
        );
    }

    /** Conteo de ingresos o salidas en [desde, hasta). */
    public function contarMovimientos(string $campoFecha, string $desde, string $hasta): int
    {
        [$condiciones, $parametros] = $this->recorte();
        $condiciones[] = "i.$campoFecha >= :desde AND i.$campoFecha < :hasta";
        $parametros[':desde'] = $desde;
        $parametros[':hasta'] = $hasta;

        $fila = $this->consultar(
            'SELECT COUNT(*) AS n FROM items i INNER JOIN colecciones c ON c.id_coleccion = i.id_coleccion ' . self::where($condiciones),
            $parametros
        );

        return (int) ($fila[0]['n'] ?? 0);
    }

    /** @return array<string, int> fecha (AAAA-MM-DD) => cantidad, solo días con movimiento. */
    public function movimientosPorDia(string $campoFecha, string $desde): array
    {
        [$condiciones, $parametros] = $this->recorte();
        $condiciones[] = "i.$campoFecha >= :desde";
        $parametros[':desde'] = $desde;

        $filas = $this->consultar(
            "SELECT DATE(i.$campoFecha) AS dia, COUNT(*) AS n
             FROM items i INNER JOIN colecciones c ON c.id_coleccion = i.id_coleccion " . self::where($condiciones) . "
             GROUP BY DATE(i.$campoFecha)",
            $parametros
        );

        $resultado = [];
        foreach ($filas as $fila) {
            $resultado[(string) $fila['dia']] = (int) $fila['n'];
        }

        return $resultado;
    }

    /** Ingresos y salidas del periodo agrupados por almacén. */
    public function movimientosPorAlmacen(string $desde): array
    {
        [$condiciones, $parametros] = $this->recorte();
        $parametros[':desde_e'] = $desde;
        $parametros[':desde_s'] = $desde;

        return $this->consultar(
            'SELECT a.id_almacen, a.nombre AS nombre_almacen,
                    SUM(CASE WHEN i.fecha_ingreso >= :desde_e THEN 1 ELSE 0 END) AS entradas,
                    SUM(CASE WHEN i.fecha_salida >= :desde_s THEN 1 ELSE 0 END) AS salidas
             FROM items i
             INNER JOIN colecciones c ON c.id_coleccion = i.id_coleccion
             INNER JOIN almacenes a ON a.id_almacen = c.id_almacen
             ' . self::where($condiciones) . '
             GROUP BY a.id_almacen, a.nombre
             ORDER BY a.nombre',
            $parametros
        );
    }

    /** Stock vigente sumado por almacén. */
    public function stockPorAlmacen(): array
    {
        [$condiciones, $parametros] = $this->recorte('vw');

        return $this->consultar(
            'SELECT vw.id_almacen, vw.nombre_almacen, SUM(vw.stock) AS stock_total
             FROM vw_stock_colecciones vw ' . self::where($condiciones) . '
             GROUP BY vw.id_almacen, vw.nombre_almacen
             ORDER BY stock_total DESC',
            $parametros
        );
    }

    /** Colecciones con más salidas en el periodo. */
    public function topSalidas(string $desde, int $limite = 6): array
    {
        [$condiciones, $parametros] = $this->recorte();
        $condiciones[] = 'i.fecha_salida >= :desde';
        $parametros[':desde'] = $desde;

        $sql = 'SELECT c.id_coleccion, c.descripcion, a.nombre AS nombre_almacen, COUNT(*) AS total_salidas
                FROM items i
                INNER JOIN colecciones c ON c.id_coleccion = i.id_coleccion
                INNER JOIN almacenes a ON a.id_almacen = c.id_almacen
                ' . self::where($condiciones) . '
                GROUP BY c.id_coleccion, c.descripcion, a.nombre
                ORDER BY total_salidas DESC
                LIMIT ' . (int) $limite;

        return $this->consultar($sql, $parametros);
    }

    /** Operaciones por usuario en el periodo (ingresos, salidas y ajustes). */
    public function actividadPorUsuario(string $desde, int $limite = 8): array
    {
        [$condiciones, $parametros] = $this->recorte();
        $condiciones[] = 'h.fecha_operacion >= :desde';
        $parametros[':desde'] = $desde;

        $sql = "SELECT u.id_usuario, u.nombre,
                       SUM(CASE WHEN h.tipo_operacion = 'ingreso' THEN 1 ELSE 0 END) AS ingresos,
                       SUM(CASE WHEN h.tipo_operacion = 'salida' THEN 1 ELSE 0 END) AS salidas,
                       SUM(CASE WHEN h.tipo_operacion NOT IN ('ingreso', 'salida') THEN 1 ELSE 0 END) AS ajustes,
                       COUNT(*) AS total
                FROM historial h
                INNER JOIN colecciones c ON c.id_coleccion = h.id_coleccion
                INNER JOIN usuarios u ON u.id_usuario = h.id_usuario
                " . self::where($condiciones) . '
                GROUP BY u.id_usuario, u.nombre
                ORDER BY total DESC
                LIMIT ' . (int) $limite;

        return $this->consultar($sql, $parametros);
    }

    /** Últimas operaciones del historial dentro del recorte. */
    public function actividadReciente(int $limite = 8): array
    {
        [$condiciones, $parametros] = $this->recorte();
        $stmt = Database::conexion()->prepare(
            'SELECT h.id_historial, h.fecha_operacion, h.tipo_operacion, h.numero_serie,
                    u.nombre AS usuario_nombre, c.descripcion AS coleccion_descripcion, a.nombre AS almacen_nombre
             FROM historial h
             INNER JOIN colecciones c ON c.id_coleccion = h.id_coleccion
             INNER JOIN almacenes a ON a.id_almacen = c.id_almacen
             INNER JOIN usuarios u ON u.id_usuario = h.id_usuario
             ' . self::where($condiciones) . '
             ORDER BY h.fecha_operacion DESC, h.id_historial DESC
             LIMIT :limite'
        );
        foreach ($parametros as $clave => $valor) {
            $stmt->bindValue($clave, $valor);
        }
        $stmt->bindValue(':limite', $limite, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }
}
