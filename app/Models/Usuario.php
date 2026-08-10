<?php

namespace App\Models;

use App\Core\Database;

class Usuario
{
    public static function buscarPorEmail(string $email): ?array
    {
        $stmt = Database::conexion()->prepare(
            'SELECT * FROM usuarios WHERE email = :email AND activo = 1'
        );
        $stmt->execute(['email' => $email]);
        $usuario = $stmt->fetch();

        return $usuario ?: null;
    }

    public static function buscarPorId(int $id): ?array
    {
        $stmt = Database::conexion()->prepare(
            'SELECT * FROM usuarios WHERE id_usuario = :id'
        );
        $stmt->execute(['id' => $id]);
        $usuario = $stmt->fetch();

        return $usuario ?: null;
    }

    /**
     * admin_general/super_admin ven todos los usuarios; admin_almacen solo
     * ve usuarios normales asignados a sus propios almacenes (nunca a otros
     * administradores).
     */
    public static function listar(?array $almacenesPermitidos = null): array
    {
        if ($almacenesPermitidos === null) {
            $stmt = Database::conexion()->query(
                'SELECT id_usuario, nombre, email, departamento, rol, tema, activo, creado_en
                 FROM usuarios WHERE activo = 1 ORDER BY nombre'
            );

            return $stmt->fetchAll();
        }

        if ($almacenesPermitidos === []) {
            return [];
        }

        $marcadores = implode(',', array_fill(0, count($almacenesPermitidos), '?'));
        $stmt = Database::conexion()->prepare(
            "SELECT DISTINCT u.id_usuario, u.nombre, u.email, u.departamento, u.rol, u.tema, u.activo, u.creado_en
             FROM usuarios u
             INNER JOIN usuario_almacenes ua ON ua.id_usuario = u.id_usuario
             WHERE u.activo = 1 AND u.rol = 'usuario_normal' AND ua.id_almacen IN ($marcadores)
             ORDER BY u.nombre"
        );
        $stmt->execute($almacenesPermitidos);

        return $stmt->fetchAll();
    }

    public static function crear(array $datos): int
    {
        $pdo = Database::conexion();
        $stmt = $pdo->prepare(
            'INSERT INTO usuarios (nombre, email, password_hash, departamento, rol)
             VALUES (:nombre, :email, :password_hash, :departamento, :rol)'
        );
        $stmt->execute([
            'nombre' => $datos['nombre'],
            'email' => $datos['email'],
            'password_hash' => password_hash($datos['password'], PASSWORD_BCRYPT),
            'departamento' => $datos['departamento'] ?? null,
            'rol' => $datos['rol'],
        ]);

        return (int) $pdo->lastInsertId();
    }

    public static function actualizar(int $id, array $datos): void
    {
        $campos = ['nombre = :nombre', 'email = :email', 'departamento = :departamento', 'rol = :rol'];
        $parametros = [
            'id' => $id,
            'nombre' => $datos['nombre'],
            'email' => $datos['email'],
            'departamento' => $datos['departamento'] ?? null,
            'rol' => $datos['rol'],
        ];

        if (!empty($datos['password'])) {
            $campos[] = 'password_hash = :password_hash';
            $parametros['password_hash'] = password_hash($datos['password'], PASSWORD_BCRYPT);
        }

        $sql = 'UPDATE usuarios SET ' . implode(', ', $campos) . ' WHERE id_usuario = :id';
        Database::conexion()->prepare($sql)->execute($parametros);
    }

    public static function eliminar(int $id): void
    {
        Database::conexion()
            ->prepare('UPDATE usuarios SET activo = 0 WHERE id_usuario = :id')
            ->execute(['id' => $id]);
    }

    public static function actualizarTema(int $id, string $tema): void
    {
        Database::conexion()
            ->prepare('UPDATE usuarios SET tema = :tema WHERE id_usuario = :id')
            ->execute(['tema' => $tema, 'id' => $id]);
    }

    /**
     * Autoservicio: el propio usuario edita su nombre/email/departamento.
     * A diferencia de actualizar(), nunca toca rol ni password_hash.
     */
    public static function actualizarPerfilPropio(int $id, array $datos): void
    {
        $stmt = Database::conexion()->prepare(
            'UPDATE usuarios SET nombre = :nombre, email = :email, departamento = :departamento WHERE id_usuario = :id'
        );
        $stmt->execute([
            'id' => $id,
            'nombre' => $datos['nombre'],
            'email' => $datos['email'],
            'departamento' => $datos['departamento'] ?? null,
        ]);
    }

    /**
     * Cambia la contraseña solo si passwordActual coincide con el hash
     * guardado. Devuelve false (sin escribir nada) si no coincide.
     */
    public static function cambiarPassword(int $id, string $passwordActual, string $passwordNueva): bool
    {
        $usuario = self::buscarPorId($id);
        if (!$usuario || !password_verify($passwordActual, $usuario['password_hash'])) {
            return false;
        }

        Database::conexion()
            ->prepare('UPDATE usuarios SET password_hash = :hash WHERE id_usuario = :id')
            ->execute(['hash' => password_hash($passwordNueva, PASSWORD_BCRYPT), 'id' => $id]);

        return true;
    }

    public static function almacenesAsignados(int $idUsuario): array
    {
        $stmt = Database::conexion()->prepare(
            'SELECT a.id_almacen, a.nombre, a.ubicacion
             FROM almacenes a
             INNER JOIN usuario_almacenes ua ON ua.id_almacen = a.id_almacen
             WHERE ua.id_usuario = :id
             ORDER BY a.nombre'
        );
        $stmt->execute(['id' => $idUsuario]);

        return $stmt->fetchAll();
    }

    public static function asignarAlmacenes(int $idUsuario, array $idsAlmacen): void
    {
        $pdo = Database::conexion();
        $pdo->prepare('DELETE FROM usuario_almacenes WHERE id_usuario = :id')->execute(['id' => $idUsuario]);

        $stmt = $pdo->prepare('INSERT INTO usuario_almacenes (id_usuario, id_almacen) VALUES (:usuario, :almacen)');
        foreach ($idsAlmacen as $idAlmacen) {
            $stmt->execute(['usuario' => $idUsuario, 'almacen' => (int) $idAlmacen]);
        }
    }

    public static function permisos(int $idUsuario): array
    {
        $stmt = Database::conexion()->prepare(
            'SELECT tipo, clave, permitido FROM permisos_usuario WHERE id_usuario = :id'
        );
        $stmt->execute(['id' => $idUsuario]);

        $permisos = [];
        foreach ($stmt->fetchAll() as $fila) {
            $permisos[$fila['clave']] = (bool) $fila['permitido'];
        }

        return $permisos;
    }

    public static function guardarPermisos(int $idUsuario, array $permisos): void
    {
        $pdo = Database::conexion();
        $update = $pdo->prepare(
            'UPDATE permisos_usuario SET permitido = :permitido WHERE id_usuario = :usuario AND clave = :clave'
        );
        $insert = $pdo->prepare(
            'INSERT INTO permisos_usuario (id_usuario, tipo, clave, permitido) VALUES (:usuario, :tipo, :clave, :permitido)'
        );

        foreach ($permisos as $clave => $permitido) {
            $tipo = str_starts_with($clave, 'vista_') ? 'vista' : 'accion';
            $permitidoValor = $permitido ? 1 : 0;

            // PDO_SQLITE con prepares nativos falla ("column index out of
            // range") si execute() recibe claves que no existen como
            // placeholder en esa consulta puntual — cada statement solo
            // debe recibir exactamente los parámetros que declara.
            $update->execute(['usuario' => $idUsuario, 'clave' => $clave, 'permitido' => $permitidoValor]);
            if ($update->rowCount() === 0) {
                $insert->execute(['usuario' => $idUsuario, 'tipo' => $tipo, 'clave' => $clave, 'permitido' => $permitidoValor]);
            }
        }
    }
}
