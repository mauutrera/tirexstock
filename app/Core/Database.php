<?php

namespace App\Core;

use PDO;
use PDOException;

/**
 * Wrapper PDO: conecta a SQLite o MySQL según config/database.php sin que
 * los modelos necesiten saber cuál de las dos está activa.
 */
class Database
{
    private static ?PDO $conexion = null;

    public static function conexion(): PDO
    {
        if (self::$conexion !== null) {
            return self::$conexion;
        }

        $config = require APP_ROOT . '/config/database.php';

        self::$conexion = $config['driver'] === 'mysql'
            ? self::conectarMysql($config['mysql'])
            : self::conectarSqlite($config['sqlite']);

        return self::$conexion;
    }

    private static function conectarMysql(array $cfg): PDO
    {
        $dsn = "mysql:host={$cfg['host']};port={$cfg['port']};dbname={$cfg['database']};charset={$cfg['charset']}";

        return new PDO($dsn, $cfg['username'], $cfg['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }

    /**
     * En desarrollo, crea el archivo SQLite y lo puebla con el esquema y los
     * datos de prueba en el primer arranque, para que el proyecto funcione
     * con solo abrir el navegador.
     */
    private static function conectarSqlite(array $cfg): PDO
    {
        $existeArchivo = file_exists($cfg['path']);

        $pdo = new PDO('sqlite:' . $cfg['path'], null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        $pdo->exec('PRAGMA foreign_keys = ON');

        if (!$existeArchivo) {
            self::ejecutarScriptSql($pdo, $cfg['schema']);
            self::ejecutarScriptSql($pdo, $cfg['seed']);
        }

        return $pdo;
    }

    private static function ejecutarScriptSql(PDO $pdo, string $ruta): void
    {
        if (!file_exists($ruta)) {
            return;
        }

        $sql = file_get_contents($ruta);

        try {
            $pdo->exec($sql);
        } catch (PDOException $e) {
            throw new PDOException('Error al inicializar la base de datos SQLite (' . basename($ruta) . '): ' . $e->getMessage());
        }
    }
}
