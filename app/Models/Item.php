<?php

namespace App\Models;

use App\Core\Database;
use PDO;
use RuntimeException;

class Item
{
    private const SELECT_BASE = "
        SELECT i.*, c.descripcion AS coleccion_descripcion, c.item AS coleccion_item,
               c.tipo AS coleccion_tipo, c.medidas AS coleccion_medidas,
               a.nombre AS almacen_nombre,
               ur.nombre AS usuario_registra_nombre, ut.nombre AS usuario_retira_nombre
        FROM items i
        INNER JOIN colecciones c ON c.id_coleccion = i.id_coleccion
        INNER JOIN almacenes a ON a.id_almacen = i.id_almacen
        LEFT JOIN usuarios ur ON ur.id_usuario = i.usuario_registra
        LEFT JOIN usuarios ut ON ut.id_usuario = i.usuario_retira
    ";

    /** @return array{datos: array, total: int} */
    public static function listarEntradas(array $filtros, int $pagina, int $porPagina, ?array $almacenesPermitidos): array
    {
        return self::listar($filtros, $pagina, $porPagina, $almacenesPermitidos, [
            'fecha_ingreso', 'usuario_registra', 'id_coleccion', 'id_almacen', 'numero_serie', 'notas_entrada',
        ]);
    }

    /** @return array{datos: array, total: int} */
    public static function listarSalidas(array $filtros, int $pagina, int $porPagina, ?array $almacenesPermitidos): array
    {
        $filtros['__solo_con_salida'] = true;

        return self::listar($filtros, $pagina, $porPagina, $almacenesPermitidos, [
            'fecha_salida', 'usuario_retira', 'id_coleccion', 'id_almacen', 'numero_serie', 'notas_salida',
        ]);
    }

    /** @return array{datos: array, total: int} */
    public static function listarPorColeccion(int $idColeccion, string $estado, array $filtros, int $pagina, int $porPagina): array
    {
        $filtros['id_coleccion'] = $idColeccion;
        if ($estado === 'sin_salida') {
            $filtros['__solo_sin_salida'] = true;
        } elseif ($estado === 'con_salida') {
            $filtros['__solo_con_salida'] = true;
        }

        return self::listar($filtros, $pagina, $porPagina, null, [
            'fecha_ingreso', 'fecha_salida', 'numero_serie', 'notas_entrada', 'notas_salida',
        ]);
    }

    private static function listar(array $filtros, int $pagina, int $porPagina, ?array $almacenesPermitidos, array $camposTexto): array
    {
        [$where, $parametros] = self::construirWhere($filtros, $almacenesPermitidos, $camposTexto);
        $pdo = Database::conexion();

        $totalStmt = $pdo->prepare("SELECT COUNT(*) AS n FROM items i $where");
        $totalStmt->execute($parametros);
        $total = (int) $totalStmt->fetch()['n'];

        $offset = max(0, ($pagina - 1) * $porPagina);
        $stmt = $pdo->prepare(self::SELECT_BASE . " $where ORDER BY i.fecha_ingreso DESC LIMIT :limite OFFSET :offset");
        foreach ($parametros as $clave => $valor) {
            $stmt->bindValue($clave, $valor);
        }
        $stmt->bindValue(':limite', $porPagina, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return ['datos' => $stmt->fetchAll(), 'total' => $total];
    }

    private static function construirWhere(array $filtros, ?array $almacenesPermitidos, array $camposTexto): array
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
            $condiciones[] = 'i.id_almacen IN (' . implode(',', $marcadores) . ')';
        }

        if (!empty($filtros['__solo_con_salida'])) {
            $condiciones[] = 'i.fecha_salida IS NOT NULL';
        }
        if (!empty($filtros['__solo_sin_salida'])) {
            $condiciones[] = 'i.fecha_salida IS NULL';
        }

        foreach (['id_coleccion', 'id_almacen', 'usuario_registra', 'usuario_retira'] as $campo) {
            if (!empty($filtros[$campo])) {
                $condiciones[] = "i.$campo = :$campo";
                $parametros[":$campo"] = (int) $filtros[$campo];
            }
        }

        foreach (['numero_serie', 'notas_entrada', 'notas_salida'] as $campo) {
            if (in_array($campo, $camposTexto, true) && !empty($filtros[$campo])) {
                $condiciones[] = "i.$campo LIKE :$campo";
                $parametros[":$campo"] = '%' . $filtros[$campo] . '%';
            }
        }

        foreach (['fecha_ingreso', 'fecha_salida'] as $campoFecha) {
            if (!in_array($campoFecha, $camposTexto, true)) {
                continue;
            }
            if (!empty($filtros[$campoFecha])) {
                $condiciones[] = "date(i.$campoFecha) = :$campoFecha";
                $parametros[":$campoFecha"] = $filtros[$campoFecha];
            }
            if (!empty($filtros[$campoFecha . '_desde'])) {
                $condiciones[] = "date(i.$campoFecha) >= :{$campoFecha}_desde";
                $parametros[":{$campoFecha}_desde"] = $filtros[$campoFecha . '_desde'];
            }
            if (!empty($filtros[$campoFecha . '_hasta'])) {
                $condiciones[] = "date(i.$campoFecha) <= :{$campoFecha}_hasta";
                $parametros[":{$campoFecha}_hasta"] = $filtros[$campoFecha . '_hasta'];
            }
        }

        $where = $condiciones ? ('WHERE ' . implode(' AND ', $condiciones)) : '';

        return [$where, $parametros];
    }

    public static function buscarPorSerie(string $numeroSerie): ?array
    {
        $stmt = Database::conexion()->prepare(self::SELECT_BASE . ' WHERE i.numero_serie = :serie');
        $stmt->execute(['serie' => $numeroSerie]);
        $item = $stmt->fetch();

        return $item ?: null;
    }

    /**
     * Búsqueda por coincidencia de número de serie entre los ítems sin salida registrada,
     * restringida a los almacenes permitidos del usuario (null = sin restricción).
     */
    public static function buscarDisponiblesPorSerie(string $texto, ?array $almacenesPermitidos, int $limite = 20): array
    {
        if ($almacenesPermitidos === []) {
            return [];
        }

        $condiciones = ['i.numero_serie LIKE :texto', 'i.fecha_salida IS NULL'];
        $parametros = ['texto' => '%' . $texto . '%'];

        if ($almacenesPermitidos !== null) {
            $marcadores = [];
            foreach ($almacenesPermitidos as $i => $idAlmacen) {
                $clave = "almacen_permitido_$i";
                $marcadores[] = ":$clave";
                $parametros[$clave] = $idAlmacen;
            }
            $condiciones[] = 'i.id_almacen IN (' . implode(',', $marcadores) . ')';
        }

        $where = 'WHERE ' . implode(' AND ', $condiciones);
        $stmt = Database::conexion()->prepare(self::SELECT_BASE . " $where ORDER BY i.numero_serie LIMIT :limite");
        foreach ($parametros as $clave => $valor) {
            $stmt->bindValue(":$clave", $valor);
        }
        $stmt->bindValue(':limite', $limite, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public static function crearEntrada(array $datos): void
    {
        $stmt = Database::conexion()->prepare(
            'INSERT INTO items (numero_serie, id_coleccion, id_almacen, fecha_ingreso, usuario_registra, notas_entrada)
             VALUES (:serie, :coleccion, :almacen, :fecha, :usuario, :notas)'
        );
        $stmt->execute([
            'serie' => $datos['numero_serie'],
            'coleccion' => (int) $datos['id_coleccion'],
            'almacen' => (int) $datos['id_almacen'],
            'fecha' => $datos['fecha_ingreso'] ?? date('Y-m-d H:i:s'),
            'usuario' => (int) $datos['usuario_registra'],
            'notas' => $datos['notas_entrada'] ?? null,
        ]);
    }

    public static function actualizarEntrada(string $numeroSerie, array $datos): void
    {
        $stmt = Database::conexion()->prepare(
            'UPDATE items SET id_coleccion = :coleccion, id_almacen = :almacen, notas_entrada = :notas
             WHERE numero_serie = :serie'
        );
        $stmt->execute([
            'serie' => $numeroSerie,
            'coleccion' => (int) $datos['id_coleccion'],
            'almacen' => (int) $datos['id_almacen'],
            'notas' => $datos['notas_entrada'] ?? null,
        ]);
    }

    /**
     * Regla 3.1: solo puede eliminarse la entrada si el ítem no tiene salida registrada.
     */
    public static function eliminarEntrada(string $numeroSerie): void
    {
        $item = self::buscarPorSerie($numeroSerie);
        if (!$item) {
            throw new RuntimeException('El ítem no existe.');
        }
        if ($item['fecha_salida'] !== null) {
            throw new RuntimeException('No se puede eliminar: el ítem ya tiene una salida registrada.');
        }

        Database::conexion()->prepare('DELETE FROM items WHERE numero_serie = :serie')->execute(['serie' => $numeroSerie]);
    }

    public static function marcarSalida(string $numeroSerie, array $datos): void
    {
        $stmt = Database::conexion()->prepare(
            'UPDATE items
             SET fecha_salida = :fecha, usuario_retira = :usuario, responsable_recibe = :responsable,
                 unidad_percibida = :unidad, posicion = :posicion, notas_salida = :notas
             WHERE numero_serie = :serie AND fecha_salida IS NULL'
        );
        $stmt->execute([
            'serie' => $numeroSerie,
            'fecha' => $datos['fecha_salida'] ?? date('Y-m-d H:i:s'),
            'usuario' => (int) $datos['usuario_retira'],
            'responsable' => $datos['responsable_recibe'] ?? null,
            'unidad' => $datos['unidad_percibida'] ?? null,
            'posicion' => $datos['posicion'] ?? null,
            'notas' => $datos['notas_salida'] ?? null,
        ]);

        if ($stmt->rowCount() === 0) {
            throw new RuntimeException('El ítem no existe o ya tiene una salida registrada.');
        }
    }

    public static function actualizarSalida(string $numeroSerie, array $datos): void
    {
        $stmt = Database::conexion()->prepare(
            'UPDATE items
             SET responsable_recibe = :responsable, unidad_percibida = :unidad,
                 posicion = :posicion, notas_salida = :notas
             WHERE numero_serie = :serie AND fecha_salida IS NOT NULL'
        );
        $stmt->execute([
            'serie' => $numeroSerie,
            'responsable' => $datos['responsable_recibe'] ?? null,
            'unidad' => $datos['unidad_percibida'] ?? null,
            'posicion' => $datos['posicion'] ?? null,
            'notas' => $datos['notas_salida'] ?? null,
        ]);
    }

    /**
     * Regla 3.2: baja lógica — solo quita la Fecha de Salida, nunca borra el registro.
     */
    public static function desmarcarSalida(string $numeroSerie): void
    {
        $stmt = Database::conexion()->prepare(
            'UPDATE items SET fecha_salida = NULL WHERE numero_serie = :serie AND fecha_salida IS NOT NULL'
        );
        $stmt->execute(['serie' => $numeroSerie]);

        if ($stmt->rowCount() === 0) {
            throw new RuntimeException('El ítem no existe o no tiene una salida registrada.');
        }
    }

    public static function movimientosRecientes(int $limite, ?array $almacenesPermitidos): array
    {
        [$where, $parametros] = self::construirWhere([], $almacenesPermitidos, []);
        $sql = self::SELECT_BASE . " $where ORDER BY i.fecha_ingreso DESC LIMIT :limite";

        $pdo = Database::conexion();
        $stmt = $pdo->prepare($sql);
        foreach ($parametros as $clave => $valor) {
            $stmt->bindValue($clave, $valor);
        }
        $stmt->bindValue(':limite', $limite, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    /**
     * @param array{item: string, tipo: string, medidas: string}|null $conjunto Filtra por el
     *   conjunto artículo/tipo/medida (independiente del almacén), para poder comparar entre
     *   almacenes las salidas de un mismo tipo de artículo.
     */
    public static function salidasPorAlmacen(?array $almacenesPermitidos, string $desde, ?array $conjunto = null): array
    {
        $filtros = array_filter([
            'fecha_salida_desde' => $desde,
            '__solo_con_salida' => true,
        ], static fn ($v) => $v !== null);

        [$where, $parametros] = self::construirWhere($filtros, $almacenesPermitidos, ['fecha_salida']);

        if ($conjunto !== null) {
            $where .= ($where ? ' AND ' : ' WHERE ') . 'c.item = :conj_item AND c.tipo = :conj_tipo AND c.medidas = :conj_medidas';
            $parametros[':conj_item'] = $conjunto['item'];
            $parametros[':conj_tipo'] = $conjunto['tipo'];
            $parametros[':conj_medidas'] = $conjunto['medidas'];
        }

        $sql = "SELECT a.nombre AS nombre_almacen, COUNT(*) AS total_salidas
                FROM items i
                INNER JOIN colecciones c ON c.id_coleccion = i.id_coleccion
                INNER JOIN almacenes a ON a.id_almacen = i.id_almacen
                $where
                GROUP BY a.nombre
                ORDER BY total_salidas DESC";

        $stmt = Database::conexion()->prepare($sql);
        $stmt->execute($parametros);

        return $stmt->fetchAll();
    }

    public static function topItemsPorSalidas(?array $almacenesPermitidos, string $desde, int $limite = 10): array
    {
        [$where, $parametros] = self::construirWhere(
            ['fecha_salida_desde' => $desde, '__solo_con_salida' => true],
            $almacenesPermitidos,
            ['fecha_salida']
        );
        $sql = "SELECT c.descripcion, c.item, c.tipo, c.medidas, COUNT(*) AS total_salidas
                FROM items i
                INNER JOIN colecciones c ON c.id_coleccion = i.id_coleccion
                $where
                GROUP BY c.id_coleccion, c.descripcion, c.item, c.tipo, c.medidas
                ORDER BY total_salidas DESC
                LIMIT :limite";

        $pdo = Database::conexion();
        $stmt = $pdo->prepare($sql);
        foreach ($parametros as $clave => $valor) {
            $stmt->bindValue($clave, $valor);
        }
        $stmt->bindValue(':limite', $limite, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }
}
