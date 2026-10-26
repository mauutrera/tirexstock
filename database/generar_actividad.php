<?php

/**
 * Generador de actividad de prueba.
 *
 * Simula el uso diario de la aplicación (ingresos por lote, salidas a
 * unidades, ediciones, bajas lógicas y entradas eliminadas por error) desde
 * el día siguiente a la última actividad registrada hasta el momento actual,
 * respetando las reglas de negocio de los modelos:
 *   - solo se da salida a ítems en stock e ingresados antes de la salida;
 *   - cada operación queda registrada en el historial con su fecha real;
 *   - solo actúan usuarios activos, asignados al almacén y con permiso.
 *
 * Funciona contra SQLite o MySQL (usa la misma conexión que la app).
 *
 * Uso:
 *   php database/generar_actividad.php [--desde=AAAA-MM-DD] [--hasta=AAAA-MM-DD] [--semilla=N] [--simular]
 */

define('APP_ROOT', dirname(__DIR__));
define('APP_ENV', getenv('APP_ENV') ?: 'development');
date_default_timezone_set('America/Bogota');

require APP_ROOT . '/app/Core/Database.php';

use App\Core\Database;

$opciones = getopt('', ['desde:', 'hasta:', 'semilla:', 'simular']);
mt_srand((int) ($opciones['semilla'] ?? 20261026));
$soloSimular = isset($opciones['simular']);

$pdo = Database::conexion();

// ------------------------------------------------------------
// Catálogos de apoyo
// ------------------------------------------------------------
const RESPONSABLES = [
    'Pedro Gómez', 'Miguel Soto', 'Laura Fernández', 'Carlos Ruiz', 'Rosa Jiménez',
    'Andrés Paredes', 'Diana Ortiz', 'Héctor Salazar', 'Ricardo Núñez', 'Fernando Lozano',
];

const NOTAS_LOTE = [
    'Compra a proveedor A', 'Compra a proveedor B', 'Reposición de stock', 'Recepción programada',
    'Lote adicional solicitado', 'Ingreso por rotación de inventario',
];

const NOTAS_SALIDA = [
    'Cambio por desgaste', 'Cambio por desgaste', 'Mantenimiento preventivo', 'Reemplazo por daño',
    'Ponchadura sin reparación', 'Rotación programada', 'Solicitud de operaciones', 'Salida a unidad de reparto',
];

// Flota fija de unidades (tractocamiones) que reciben llantas.
$flota = [];
while (count($flota) < 45) {
    $flota[(string) mt_rand(3000, 3999)] = true;
}
$flota = array_keys($flota);

function elegir(array $opciones): mixed
{
    return $opciones[mt_rand(0, count($opciones) - 1)];
}

function probabilidad(float $p): bool
{
    return mt_rand() / mt_getrandmax() < $p;
}

function poisson(float $lambda): int
{
    $l = exp(-$lambda);
    $k = 0;
    $p = 1.0;
    do {
        $k++;
        $p *= mt_rand() / mt_getrandmax();
    } while ($p > $l);

    return $k - 1;
}

/** Hora aleatoria del día dentro de un rango laboral, como timestamp. */
function horaEn(int $dia, float $desde, float $hasta): int
{
    return $dia + (int) (($desde + (mt_rand() / mt_getrandmax()) * ($hasta - $desde)) * 3600);
}

/** Posiciones válidas según el tipo de llanta (1-2 dirección, 3-10 tracción, 11-14 arrastre). */
function posicionesPara(string $tipo): array
{
    $tipo = mb_strtolower($tipo);

    return match (true) {
        str_contains($tipo, 'direc') => [1, 2],
        str_contains($tipo, 'arrastre') => range(11, 14),
        default => range(3, 10),
    };
}

// ------------------------------------------------------------
// Estado actual de la base de datos
// ------------------------------------------------------------
$ultimaActividad = max(array_filter([
    $pdo->query('SELECT MAX(fecha_ingreso) FROM items')->fetchColumn(),
    $pdo->query('SELECT MAX(fecha_salida) FROM items')->fetchColumn(),
    $pdo->query('SELECT MAX(fecha_operacion) FROM historial')->fetchColumn(),
]) ?: [date('Y-m-d', strtotime('-60 days'))]);

$inicio = strtotime($opciones['desde'] ?? date('Y-m-d', strtotime($ultimaActividad . ' +1 day')));
$ahora = time();
$fin = isset($opciones['hasta']) ? min(strtotime($opciones['hasta'] . ' 23:59:59'), $ahora) : $ahora;

if ($inicio > $fin) {
    fwrite(STDERR, "No hay días por simular: la última actividad es $ultimaActividad.\n");
    exit(1);
}

$usuarios = $pdo->query('SELECT id_usuario, nombre, rol FROM usuarios WHERE activo = 1')->fetchAll();
$permisos = [];
foreach ($pdo->query('SELECT id_usuario, clave, permitido FROM permisos_usuario')->fetchAll() as $p) {
    $permisos[$p['id_usuario']][$p['clave']] = (bool) $p['permitido'];
}
$asignaciones = [];
foreach ($pdo->query('SELECT id_usuario, id_almacen FROM usuario_almacenes')->fetchAll() as $a) {
    $asignaciones[$a['id_almacen']][] = (int) $a['id_usuario'];
}

$globales = array_values(array_filter($usuarios, static fn ($u) => in_array($u['rol'], ['super_admin', 'admin_general'], true)));

/**
 * Usuarios que pueden operar un almacén. El personal asignado hace casi todo
 * el trabajo; los administradores globales intervienen de forma ocasional
 * (o siempre, si el almacén no tiene personal propio).
 */
function actoresDe(int $idAlmacen, string $accion, array $usuarios, array $asignaciones, array $permisos): array
{
    $locales = [];
    foreach ($usuarios as $u) {
        if (!in_array((int) $u['id_usuario'], $asignaciones[$idAlmacen] ?? [], true)) {
            continue;
        }
        $puede = match ($u['rol']) {
            'admin_almacen' => true,
            'usuario_normal' => $accion !== 'admin' && !empty($permisos[$u['id_usuario']]['accion_' . $accion]),
            default => false,
        };
        if ($puede) {
            $locales[] = (int) $u['id_usuario'];
        }
    }

    return $locales;
}

$colecciones = $pdo->query(
    'SELECT c.* FROM colecciones c INNER JOIN almacenes a ON a.id_almacen = c.id_almacen WHERE a.activo = 1'
)->fetchAll();

$stock = [];
foreach ($colecciones as $c) {
    $stmt = $pdo->prepare('SELECT numero_serie, fecha_ingreso FROM items WHERE id_coleccion = :c AND fecha_salida IS NULL ORDER BY fecha_ingreso');
    $stmt->execute(['c' => $c['id_coleccion']]);
    $stock[$c['id_coleccion']] = array_map(static fn ($i) => ['serie' => $i['numero_serie'], 'ingreso' => strtotime($i['fecha_ingreso'])], $stmt->fetchAll());
}

$series = array_flip($pdo->query('SELECT numero_serie FROM items')->fetchAll(PDO::FETCH_COLUMN));
$nuevaSerie = static function () use (&$series): string {
    do {
        $serie = (string) mt_rand(100000, 999999);
    } while (isset($series[$serie]));
    $series[$serie] = true;

    return $serie;
};

// ------------------------------------------------------------
// Sentencias
// ------------------------------------------------------------
$sql = [
    'ingreso' => $pdo->prepare(
        'INSERT INTO items (numero_serie, id_coleccion, id_almacen, fecha_ingreso, usuario_registra, notas_entrada)
         VALUES (:serie, :coleccion, :almacen, :fecha, :usuario, :notas)'
    ),
    'salida' => $pdo->prepare(
        'UPDATE items SET fecha_salida = :fecha, usuario_retira = :usuario, responsable_recibe = :responsable,
                unidad_percibida = :unidad, posicion = :posicion, notas_salida = :notas
         WHERE numero_serie = :serie AND fecha_salida IS NULL'
    ),
    'editar_salida' => $pdo->prepare('UPDATE items SET unidad_percibida = :unidad, notas_salida = :notas WHERE numero_serie = :serie'),
    'editar_entrada' => $pdo->prepare('UPDATE items SET notas_entrada = :notas WHERE numero_serie = :serie'),
    'desmarcar' => $pdo->prepare('UPDATE items SET fecha_salida = NULL WHERE numero_serie = :serie'),
    'eliminar' => $pdo->prepare('DELETE FROM items WHERE numero_serie = :serie'),
    'historial' => $pdo->prepare(
        'INSERT INTO historial (fecha_operacion, tipo_operacion, id_usuario, numero_serie, id_coleccion, detalle)
         VALUES (:fecha, :tipo, :usuario, :serie, :coleccion, :detalle)'
    ),
];

$conteo = array_fill_keys(['ingreso', 'salida', 'edicion', 'desmarque_salida', 'eliminacion'], 0);

$registrar = static function (int $ts, string $tipo, int $usuario, string $serie, int $coleccion, string $detalle) use ($sql, &$conteo): void {
    $sql['historial']->execute([
        'fecha' => date('Y-m-d H:i:s', $ts), 'tipo' => $tipo, 'usuario' => $usuario,
        'serie' => $serie, 'coleccion' => $coleccion, 'detalle' => $detalle,
    ]);
    $conteo[$tipo]++;
};

$elegirActor = static function (int $idAlmacen, string $accion) use ($usuarios, $asignaciones, $permisos, $globales): ?int {
    $locales = actoresDe($idAlmacen, $accion, $usuarios, $asignaciones, $permisos);
    if ($locales && !($globales && probabilidad(0.08))) {
        return elegir($locales);
    }

    return $globales ? (int) elegir($globales)['id_usuario'] : null;
};

// ------------------------------------------------------------
// Simulación día por día
// ------------------------------------------------------------
$lotesPendientes = [];   // id_coleccion => timestamp del día de llegada
$pendientes = [];        // operaciones diferidas (desmarques / correcciones)

$pdo->beginTransaction();

for ($dia = strtotime(date('Y-m-d', $inicio)); $dia <= $fin; $dia = strtotime('+1 day', $dia)) {
    $diaSemana = (int) date('N', $dia);
    if ($diaSemana === 7 && !probabilidad(0.1)) {
        continue; // Domingo: casi nunca se opera.
    }
    $sabado = $diaSemana === 6;
    [$horaInicio, $horaFin] = $sabado ? [8.0, 13.5] : [7.5, 18.5];
    $factor = $sabado ? 0.45 : 1.0;

    $eventos = [];

    foreach ($colecciones as $c) {
        $id = (int) $c['id_coleccion'];
        $umbral = (int) $c['umbral_stock_bajo'];

        // Llegada de lotes de reposición (por la mañana).
        if (isset($lotesPendientes[$id]) && $lotesPendientes[$id] <= $dia && !$sabado) {
            $hora = horaEn($dia, 8.0, 11.0);
            $cantidad = mt_rand(10, 18);
            $nota = elegir(NOTAS_LOTE);
            for ($n = 0; $n < $cantidad; $n++) {
                $eventos[] = ['ts' => $hora + $n * mt_rand(40, 150), 'tipo' => 'ingreso', 'c' => $c, 'nota' => $nota];
            }
            unset($lotesPendientes[$id]);
        } elseif (probabilidad(0.04 * $factor)) {
            // Ingreso suelto: devolución de taller o llanta reacondicionada.
            $eventos[] = ['ts' => horaEn($dia, $horaInicio, $horaFin), 'tipo' => 'ingreso', 'c' => $c,
                'nota' => elegir(['Ingreso por devolución de taller', 'Llanta renovada (vitalizado)', null])];
        }

        // Salidas: unidades que pasan a cambio de llantas (a veces en par).
        $esDireccion = str_contains(mb_strtolower($c['tipo']), 'direc');
        $servicios = poisson(($esDireccion ? 0.3 : 0.45) * $factor);
        for ($s = 0; $s < $servicios; $s++) {
            $hora = horaEn($dia, $horaInicio + 0.5, $horaFin);
            $unidad = elegir($flota);
            $posiciones = posicionesPara($c['tipo']);
            shuffle($posiciones);
            $piezas = probabilidad($esDireccion ? 0.55 : 0.35) ? 2 : 1;
            for ($p = 0; $p < $piezas; $p++) {
                $eventos[] = ['ts' => $hora + $p * mt_rand(60, 300), 'tipo' => 'salida', 'c' => $c, 'unidad' => $unidad, 'posicion' => $posiciones[$p]];
            }
        }

        // Si el stock proyectado queda cerca del umbral, se pide un lote (llega en 1-4 días hábiles).
        if (!isset($lotesPendientes[$id]) && count($stock[$id]) <= $umbral + 5 && probabilidad(0.7)) {
            $lotesPendientes[$id] = strtotime('+' . mt_rand(1, 4) . ' days', $dia);
        }
    }

    foreach ($pendientes as $i => $op) {
        if ($op['ts'] < $dia + 86400) {
            $eventos[] = $op;
            unset($pendientes[$i]);
        }
    }

    usort($eventos, static fn ($a, $b) => $a['ts'] <=> $b['ts']);

    foreach ($eventos as $e) {
        if ($e['ts'] > $fin) {
            break;
        }
        $c = $e['c'];
        $id = (int) $c['id_coleccion'];
        $almacen = (int) $c['id_almacen'];
        $fecha = date('Y-m-d H:i:s', $e['ts']);

        switch ($e['tipo']) {
            case 'ingreso':
                $usuario = $elegirActor($almacen, 'agregar_entrada');
                if ($usuario === null) {
                    break;
                }
                $serie = $nuevaSerie();
                $sql['ingreso']->execute([
                    'serie' => $serie, 'coleccion' => $id, 'almacen' => $almacen,
                    'fecha' => $fecha, 'usuario' => $usuario, 'notas' => $e['nota'],
                ]);
                $registrar($e['ts'], 'ingreso', $usuario, $serie, $id, 'Ingreso registrado: ' . $serie);

                // Captura equivocada: se elimina la entrada minutos después.
                if (probabilidad(0.012)) {
                    $admin = $elegirActor($almacen, 'admin') ?? $usuario;
                    $sql['eliminar']->execute(['serie' => $serie]);
                    $registrar($e['ts'] + mt_rand(120, 1800), 'eliminacion', $admin, $serie, $id, 'Entrada eliminada: ' . $serie);
                    break;
                }
                // Corrección de nota de entrada.
                if (probabilidad(0.015)) {
                    $admin = $elegirActor($almacen, 'admin') ?? $usuario;
                    $sql['editar_entrada']->execute(['serie' => $serie, 'notas' => elegir(NOTAS_LOTE) . ' (corregido)']);
                    $registrar($e['ts'] + mt_rand(600, 7200), 'edicion', $admin, $serie, $id, 'Entrada editada: ' . $serie);
                }
                $stock[$id][] = ['serie' => $serie, 'ingreso' => $e['ts']];
                break;

            case 'salida':
                // FIFO: sale la llanta más antigua en stock que ya estuviera ingresada.
                $indice = null;
                foreach ($stock[$id] as $k => $it) {
                    if ($it['ingreso'] < $e['ts'] - 600) {
                        $indice = $k;
                        break;
                    }
                }
                $usuario = $elegirActor($almacen, 'marcar_salida');
                if ($indice === null || $usuario === null) {
                    break;
                }
                $serie = $stock[$id][$indice]['serie'];
                $ingreso = $stock[$id][$indice]['ingreso'];
                array_splice($stock[$id], $indice, 1);

                $sql['salida']->execute([
                    'serie' => $serie, 'fecha' => $fecha, 'usuario' => $usuario,
                    'responsable' => elegir(RESPONSABLES), 'unidad' => $e['unidad'],
                    'posicion' => (string) $e['posicion'], 'notas' => probabilidad(0.85) ? elegir(NOTAS_SALIDA) : null,
                ]);
                $registrar($e['ts'], 'salida', $usuario, $serie, $id, 'Salida registrada: ' . $serie);

                if (probabilidad(0.015)) {
                    // Salida marcada por error: un administrador la desmarca (baja lógica).
                    $pendientes[] = ['ts' => $e['ts'] + mt_rand(900, 30 * 3600), 'tipo' => 'desmarque', 'c' => $c, 'serie' => $serie, 'ingreso' => $ingreso];
                } elseif (probabilidad(0.03)) {
                    // Unidad capturada mal: se corrige la salida.
                    $pendientes[] = ['ts' => $e['ts'] + mt_rand(600, 20 * 3600), 'tipo' => 'editar_salida', 'c' => $c, 'serie' => $serie];
                }
                break;

            case 'desmarque':
                $admin = $elegirActor($almacen, 'admin');
                if ($admin === null) {
                    break;
                }
                $sql['desmarcar']->execute(['serie' => $e['serie']]);
                $registrar($e['ts'], 'desmarque_salida', $admin, $e['serie'], $id, 'Salida desmarcada (baja lógica): ' . $e['serie']);
                $stock[$id][] = ['serie' => $e['serie'], 'ingreso' => $e['ingreso']];
                usort($stock[$id], static fn ($a, $b) => $a['ingreso'] <=> $b['ingreso']);
                break;

            case 'editar_salida':
                $admin = $elegirActor($almacen, 'admin');
                if ($admin === null) {
                    break;
                }
                $sql['editar_salida']->execute(['serie' => $e['serie'], 'unidad' => elegir($flota), 'notas' => 'Unidad corregida']);
                $registrar($e['ts'], 'edicion', $admin, $e['serie'], $id, 'Salida editada: ' . $e['serie']);
                break;
        }
    }
}

if ($soloSimular) {
    $pdo->rollBack();
} else {
    $pdo->commit();
}

printf(
    "%s actividad del %s al %s:\n",
    $soloSimular ? 'Simulada (sin guardar)' : 'Generada',
    date('Y-m-d', $inicio),
    date('Y-m-d H:i', $fin)
);
foreach ($conteo as $tipo => $n) {
    printf("  %-17s %d\n", $tipo, $n);
}
foreach ($colecciones as $c) {
    printf("  Stock colección #%d (%s, almacén %d): %d\n", $c['id_coleccion'], $c['descripcion'], $c['id_almacen'], count($stock[$c['id_coleccion']]));
}
