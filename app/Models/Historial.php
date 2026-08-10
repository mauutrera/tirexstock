<?php

namespace App\Models;

use App\Core\Database;
use PDO;

class Historial
{
    public static function registrar(int $idUsuario, string $tipoOperacion, string $numeroSerie, int $idColeccion, string $detalle): void
    {
        $stmt = Database::conexion()->prepare(
            'INSERT INTO historial (tipo_operacion, id_usuario, numero_serie, id_coleccion, detalle)
             VALUES (:tipo, :usuario, :serie, :coleccion, :detalle)'
        );
        $stmt->execute([
            'tipo' => $tipoOperacion,
            'usuario' => $idUsuario,
            'serie' => $numeroSerie,
            'coleccion' => $idColeccion,
            'detalle' => $detalle,
        ]);
    }

    /** @return array{datos: array, total: int} */
    public static function listar(array $filtros, int $pagina, int $porPagina, ?array $almacenesPermitidos): array
    {
        $condiciones = [];
        $parametros = [];

        if ($almacenesPermitidos !== null) {
            if ($almacenesPermitidos === []) {
                return ['datos' => [], 'total' => 0];
            }
            $marcadores = [];
            foreach ($almacenesPermitidos as $i => $idAlmacen) {
                $clave = ":almacen_$i";
                $marcadores[] = $clave;
                $parametros[$clave] = $idAlmacen;
            }
            $condiciones[] = "c.id_almacen IN (" . implode(',', $marcadores) . ')';
        }

        if (!empty($filtros['numero_serie'])) {
            $condiciones[] = 'h.numero_serie LIKE :numero_serie';
            $parametros[':numero_serie'] = '%' . $filtros['numero_serie'] . '%';
        }
        if (!empty($filtros['id_coleccion'])) {
            $condiciones[] = 'h.id_coleccion = :id_coleccion';
            $parametros[':id_coleccion'] = (int) $filtros['id_coleccion'];
        }
        if (!empty($filtros['id_usuario'])) {
            $condiciones[] = 'h.id_usuario = :id_usuario';
            $parametros[':id_usuario'] = (int) $filtros['id_usuario'];
        }
        if (!empty($filtros['tipo_operacion'])) {
            $condiciones[] = 'h.tipo_operacion = :tipo_operacion';
            $parametros[':tipo_operacion'] = $filtros['tipo_operacion'];
        }
        if (!empty($filtros['fecha_desde'])) {
            $condiciones[] = 'date(h.fecha_operacion) >= :fecha_desde';
            $parametros[':fecha_desde'] = $filtros['fecha_desde'];
        }
        if (!empty($filtros['fecha_hasta'])) {
            $condiciones[] = 'date(h.fecha_operacion) <= :fecha_hasta';
            $parametros[':fecha_hasta'] = $filtros['fecha_hasta'];
        }

        $where = $condiciones ? ('WHERE ' . implode(' AND ', $condiciones)) : '';
        $base = "FROM historial h
                 INNER JOIN colecciones c ON c.id_coleccion = h.id_coleccion
                 INNER JOIN usuarios u ON u.id_usuario = h.id_usuario
                 $where";

        $pdo = Database::conexion();
        $totalStmt = $pdo->prepare("SELECT COUNT(*) AS n $base");
        $totalStmt->execute($parametros);
        $total = (int) $totalStmt->fetch()['n'];

        $offset = max(0, ($pagina - 1) * $porPagina);
        $stmt = $pdo->prepare(
            "SELECT h.*, u.nombre AS usuario_nombre, c.descripcion AS coleccion_descripcion
             $base ORDER BY h.fecha_operacion DESC LIMIT :limite OFFSET :offset"
        );
        foreach ($parametros as $clave => $valor) {
            $stmt->bindValue($clave, $valor);
        }
        $stmt->bindValue(':limite', $porPagina, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return ['datos' => $stmt->fetchAll(), 'total' => $total];
    }
}
