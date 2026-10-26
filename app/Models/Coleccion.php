<?php

namespace App\Models;

use App\Core\Database;

class Coleccion
{
    /**
     * Listado paginado con stock calculado (vw_stock_colecciones), filtros
     * por columna y restricción de almacenes visibles según el rol.
     *
     * @return array{datos: array, total: int}
     */
    public static function listar(array $filtros, int $pagina, int $porPagina, ?array $almacenesPermitidos): array
    {
        [$where, $parametros] = self::construirWhere($filtros, $almacenesPermitidos);

        $pdo = Database::conexion();
        $total = self::contar($pdo, $where, $parametros);

        $offset = max(0, ($pagina - 1) * $porPagina);
        $stmt = $pdo->prepare(
            "SELECT vw.*, (SELECT COUNT(*) FROM items i WHERE i.id_coleccion = vw.id_coleccion) AS total_items
             FROM vw_stock_colecciones vw
             $where
             ORDER BY vw.id_coleccion LIMIT :limite OFFSET :offset"
        );
        foreach ($parametros as $clave => $valor) {
            $stmt->bindValue($clave, $valor);
        }
        $stmt->bindValue(':limite', $porPagina, \PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        return ['datos' => $stmt->fetchAll(), 'total' => $total];
    }

    private static function contar(\PDO $pdo, string $where, array $parametros): int
    {
        $stmt = $pdo->prepare("SELECT COUNT(*) AS n FROM vw_stock_colecciones $where");
        $stmt->execute($parametros);

        return (int) $stmt->fetch()['n'];
    }

    private static function construirWhere(array $filtros, ?array $almacenesPermitidos): array
    {
        $condiciones = [];
        $parametros = [];

        if ($almacenesPermitidos !== null) {
            if ($almacenesPermitidos === []) {
                return ['WHERE 1 = 0', []];
            }
            $marcadores = [];
            foreach ($almacenesPermitidos as $i => $idAlmacen) {
                $clave = ":almacen_permitido_$i";
                $marcadores[] = $clave;
                $parametros[$clave] = $idAlmacen;
            }
            $condiciones[] = 'id_almacen IN (' . implode(',', $marcadores) . ')';
        }

        if (!empty($filtros['id_almacen'])) {
            $condiciones[] = 'id_almacen = :id_almacen';
            $parametros[':id_almacen'] = (int) $filtros['id_almacen'];
        }
        foreach (['item', 'tipo', 'medidas', 'descripcion'] as $campo) {
            if (!empty($filtros[$campo])) {
                $condiciones[] = "$campo LIKE :$campo";
                $parametros[":$campo"] = '%' . $filtros[$campo] . '%';
            }
        }

        $where = $condiciones ? ('WHERE ' . implode(' AND ', $condiciones)) : '';

        return [$where, $parametros];
    }

    public static function buscarPorId(int $id): ?array
    {
        $stmt = Database::conexion()->prepare('SELECT * FROM vw_stock_colecciones WHERE id_coleccion = :id');
        $stmt->execute(['id' => $id]);
        $coleccion = $stmt->fetch();

        return $coleccion ?: null;
    }

    public static function crear(array $datos): int
    {
        $pdo = Database::conexion();
        $stmt = $pdo->prepare(
            'INSERT INTO colecciones (descripcion, item, tipo, medidas, id_almacen, umbral_stock_bajo)
             VALUES (:descripcion, :item, :tipo, :medidas, :id_almacen, :umbral)'
        );
        $stmt->execute([
            'descripcion' => $datos['descripcion'],
            'item' => $datos['item'],
            'tipo' => $datos['tipo'],
            'medidas' => $datos['medidas'],
            'id_almacen' => (int) $datos['id_almacen'],
            'umbral' => (int) ($datos['umbral_stock_bajo'] ?? UMBRAL_STOCK_BAJO_DEFECTO),
        ]);

        return (int) $pdo->lastInsertId();
    }

    public static function actualizar(int $id, array $datos): void
    {
        $stmt = Database::conexion()->prepare(
            'UPDATE colecciones
             SET descripcion = :descripcion, item = :item, tipo = :tipo, medidas = :medidas,
                 id_almacen = :id_almacen, umbral_stock_bajo = :umbral
             WHERE id_coleccion = :id'
        );
        $stmt->execute([
            'id' => $id,
            'descripcion' => $datos['descripcion'],
            'item' => $datos['item'],
            'tipo' => $datos['tipo'],
            'medidas' => $datos['medidas'],
            'id_almacen' => (int) $datos['id_almacen'],
            'umbral' => (int) ($datos['umbral_stock_bajo'] ?? UMBRAL_STOCK_BAJO_DEFECTO),
        ]);
    }

    /** true si la colección tiene ítems asociados (actuales o históricos, con o sin salida). */
    public static function tieneItems(int $id): bool
    {
        $stmt = Database::conexion()->prepare('SELECT COUNT(*) AS n FROM items WHERE id_coleccion = :id');
        $stmt->execute(['id' => $id]);

        return ((int) $stmt->fetch()['n']) > 0;
    }

    /**
     * Solo debe llamarse sobre colecciones sin ítems (ver tieneItems()). El historial
     * huérfano que quede de ítems ya eliminados (regla 3.1) se limpia junto con la colección.
     */
    public static function eliminar(int $id): void
    {
        $pdo = Database::conexion();
        $pdo->beginTransaction();
        try {
            $pdo->prepare('DELETE FROM historial WHERE id_coleccion = :id')->execute(['id' => $id]);
            $pdo->prepare('DELETE FROM colecciones WHERE id_coleccion = :id')->execute(['id' => $id]);
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    public static function conStockBajo(?array $almacenesPermitidos): array
    {
        [$where, $parametros] = self::construirWhere([], $almacenesPermitidos);
        $conector = $where ? ' AND ' : ' WHERE ';
        $sql = "SELECT * FROM vw_stock_colecciones $where{$conector}stock <= umbral_stock_bajo ORDER BY stock ASC";

        $stmt = Database::conexion()->prepare($sql);
        $stmt->execute($parametros);

        return $stmt->fetchAll();
    }

    /**
     * Conjuntos únicos de artículo/tipo/medida (independiente del almacén), para el filtro
     * comparativo del Dashboard: agrupa las colecciones equivalentes de distintos almacenes.
     */
    public static function listarConjuntos(?array $almacenesPermitidos): array
    {
        [$where, $parametros] = self::construirWhere([], $almacenesPermitidos);
        $sql = "SELECT item, tipo, medidas, MIN(descripcion) AS descripcion
                FROM colecciones
                $where
                GROUP BY item, tipo, medidas
                ORDER BY descripcion";

        $stmt = Database::conexion()->prepare($sql);
        $stmt->execute($parametros);

        return $stmt->fetchAll();
    }
}
