-- ============================================================
-- SISTEMA DE INVENTARIO POR COLECCIONES
-- Script de creación de esquema - SQLite (Desarrollo)
-- ============================================================

PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------
-- Usuarios
-- ------------------------------------------------------------
CREATE TABLE usuarios (
  id_usuario      INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre          TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  departamento    TEXT,
  rol             TEXT NOT NULL CHECK (rol IN ('super_admin', 'admin_general', 'admin_almacen', 'usuario_normal')),
  tema            TEXT NOT NULL DEFAULT 'claro' CHECK (tema IN ('claro', 'oscuro')),
  activo          INTEGER NOT NULL DEFAULT 1,
  creado_en       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------
-- Almacenes
-- ------------------------------------------------------------
CREATE TABLE almacenes (
  id_almacen      INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre          TEXT NOT NULL,
  ubicacion       TEXT,
  activo          INTEGER NOT NULL DEFAULT 1,
  creado_en       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------
-- Relación Usuario <-> Almacén
-- ------------------------------------------------------------
CREATE TABLE usuario_almacenes (
  id_usuario      INTEGER NOT NULL,
  id_almacen      INTEGER NOT NULL,
  PRIMARY KEY (id_usuario, id_almacen),
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  FOREIGN KEY (id_almacen) REFERENCES almacenes(id_almacen) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Permisos configurables (vistas y acciones) por usuario normal
-- ------------------------------------------------------------
CREATE TABLE permisos_usuario (
  id_permiso      INTEGER PRIMARY KEY AUTOINCREMENT,
  id_usuario      INTEGER NOT NULL,
  tipo            TEXT NOT NULL CHECK (tipo IN ('vista', 'accion')),
  clave           TEXT NOT NULL,
  permitido       INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  UNIQUE (id_usuario, clave)
);

-- ------------------------------------------------------------
-- Inventario por Colecciones (colección + almacén)
-- ------------------------------------------------------------
CREATE TABLE colecciones (
  id_coleccion         INTEGER PRIMARY KEY AUTOINCREMENT,
  descripcion          TEXT NOT NULL,
  item                 TEXT NOT NULL,
  tipo                 TEXT NOT NULL,
  medidas              TEXT NOT NULL,
  id_almacen           INTEGER NOT NULL,
  umbral_stock_bajo    INTEGER NOT NULL DEFAULT 2,
  creado_en            TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (id_almacen) REFERENCES almacenes(id_almacen)
);

-- ------------------------------------------------------------
-- Ítems por Colección (unidades individuales por número de serie)
-- ------------------------------------------------------------
CREATE TABLE items (
  numero_serie        TEXT PRIMARY KEY,
  id_coleccion         INTEGER NOT NULL,
  id_almacen           INTEGER NOT NULL,
  fecha_ingreso        TEXT NOT NULL,
  usuario_registra     INTEGER NOT NULL,
  notas_entrada        TEXT,
  fecha_salida         TEXT NULL,
  usuario_retira       INTEGER NULL,
  responsable_recibe   TEXT,
  unidad_percibida     TEXT,
  posicion             TEXT,
  notas_salida         TEXT,
  FOREIGN KEY (id_coleccion) REFERENCES colecciones(id_coleccion),
  FOREIGN KEY (id_almacen) REFERENCES almacenes(id_almacen),
  FOREIGN KEY (usuario_registra) REFERENCES usuarios(id_usuario),
  FOREIGN KEY (usuario_retira) REFERENCES usuarios(id_usuario)
);

CREATE INDEX idx_items_coleccion ON items(id_coleccion);
CREATE INDEX idx_items_almacen ON items(id_almacen);
CREATE INDEX idx_items_fecha_salida ON items(fecha_salida);

-- ------------------------------------------------------------
-- Historial / Log de operaciones (auditoría)
-- ------------------------------------------------------------
CREATE TABLE historial (
  id_historial      INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha_operacion   TEXT NOT NULL DEFAULT (datetime('now')),
  tipo_operacion    TEXT NOT NULL CHECK (tipo_operacion IN ('ingreso', 'salida', 'desmarque_salida', 'edicion', 'eliminacion')),
  id_usuario        INTEGER NOT NULL,
  numero_serie      TEXT NOT NULL,
  id_coleccion      INTEGER NOT NULL,
  detalle           TEXT,
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
  FOREIGN KEY (id_coleccion) REFERENCES colecciones(id_coleccion)
);

CREATE INDEX idx_historial_serie ON historial(numero_serie);
CREATE INDEX idx_historial_coleccion ON historial(id_coleccion);
CREATE INDEX idx_historial_fecha ON historial(fecha_operacion);

-- ------------------------------------------------------------
-- Vista: Stock calculado por colección (colección + almacén)
-- ------------------------------------------------------------
CREATE VIEW vw_stock_colecciones AS
SELECT
  c.id_coleccion,
  c.descripcion,
  c.item,
  c.tipo,
  c.medidas,
  c.id_almacen,
  a.nombre AS nombre_almacen,
  c.umbral_stock_bajo,
  COUNT(i.numero_serie) AS stock
FROM colecciones c
LEFT JOIN items i
  ON i.id_coleccion = c.id_coleccion
  AND i.fecha_salida IS NULL
LEFT JOIN almacenes a
  ON a.id_almacen = c.id_almacen
GROUP BY c.id_coleccion, c.descripcion, c.item, c.tipo, c.medidas,
         c.id_almacen, a.nombre, c.umbral_stock_bajo;
