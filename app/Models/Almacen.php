<?php

namespace App\Models;

use App\Core\Database;

class Almacen
{
    public static function listar(?array $idsPermitidos = null): array
    {
        $sql = 'SELECT id_almacen, nombre, ubicacion, activo FROM almacenes WHERE activo = 1';
        $parametros = [];

        if ($idsPermitidos !== null) {
            if ($idsPermitidos === []) {
                return [];
            }
            $marcadores = implode(',', array_fill(0, count($idsPermitidos), '?'));
            $sql .= " AND id_almacen IN ($marcadores)";
            $parametros = $idsPermitidos;
        }

        $sql .= ' ORDER BY nombre';
        $stmt = Database::conexion()->prepare($sql);
        $stmt->execute($parametros);

        return $stmt->fetchAll();
    }

    public static function buscarPorId(int $id): ?array
    {
        $stmt = Database::conexion()->prepare('SELECT * FROM almacenes WHERE id_almacen = :id');
        $stmt->execute(['id' => $id]);
        $almacen = $stmt->fetch();

        return $almacen ?: null;
    }

    public static function crear(array $datos): int
    {
        $pdo = Database::conexion();
        $stmt = $pdo->prepare('INSERT INTO almacenes (nombre, ubicacion) VALUES (:nombre, :ubicacion)');
        $stmt->execute([
            'nombre' => $datos['nombre'],
            'ubicacion' => $datos['ubicacion'] ?? null,
        ]);

        return (int) $pdo->lastInsertId();
    }

    public static function actualizar(int $id, array $datos): void
    {
        $stmt = Database::conexion()->prepare(
            'UPDATE almacenes SET nombre = :nombre, ubicacion = :ubicacion WHERE id_almacen = :id'
        );
        $stmt->execute([
            'id' => $id,
            'nombre' => $datos['nombre'],
            'ubicacion' => $datos['ubicacion'] ?? null,
        ]);
    }

    public static function eliminar(int $id): void
    {
        Database::conexion()
            ->prepare('UPDATE almacenes SET activo = 0 WHERE id_almacen = :id')
            ->execute(['id' => $id]);
    }
}
