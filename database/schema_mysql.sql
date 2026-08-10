-- ============================================================
-- SISTEMA DE INVENTARIO POR COLECCIONES
-- Script de creación de esquema - MySQL (Producción)
-- ============================================================

CREATE DATABASE IF NOT EXISTS inventario_colecciones
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE inventario_colecciones;

-- ------------------------------------------------------------
-- Usuarios
-- ------------------------------------------------------------
CREATE TABLE usuarios (
  id_usuario      INT AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(150) NOT NULL,
  email           VARCHAR(150) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  departamento    VARCHAR(100),
  rol             ENUM('super_admin', 'admin_general', 'admin_almacen', 'usuario_normal') NOT NULL,
  tema            ENUM('claro', 'oscuro') NOT NULL DEFAULT 'claro',
  activo          TINYINT(1) NOT NULL DEFAULT 1,
  creado_en       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Almacenes
-- ------------------------------------------------------------
CREATE TABLE almacenes (
  id_almacen      INT AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(150) NOT NULL,
  ubicacion       VARCHAR(255),
  activo          TINYINT(1) NOT NULL DEFAULT 1,
  creado_en       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Relación Usuario <-> Almacén
-- (jerarquía de admin_almacen y asignación de usuario_normal)
-- ------------------------------------------------------------
CREATE TABLE usuario_almacenes (
  id_usuario      INT NOT NULL,
  id_almacen      INT NOT NULL,
  PRIMARY KEY (id_usuario, id_almacen),
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  FOREIGN KEY (id_almacen) REFERENCES almacenes(id_almacen) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Permisos configurables (vistas y acciones) por usuario normal
-- ------------------------------------------------------------
CREATE TABLE permisos_usuario (
  id_permiso      INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario      INT NOT NULL,
  tipo            ENUM('vista', 'accion') NOT NULL,
  clave           VARCHAR(100) NOT NULL, -- ej: 'vista_historial', 'accion_eliminar_entrada'
  permitido       TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  UNIQUE KEY uq_usuario_clave (id_usuario, clave)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Inventario por Colecciones (colección + almacén)
-- ------------------------------------------------------------
CREATE TABLE colecciones (
  id_coleccion        INT AUTO_INCREMENT PRIMARY KEY,
  descripcion          VARCHAR(255) NOT NULL,
  item                 VARCHAR(100) NOT NULL,
  tipo                 VARCHAR(100) NOT NULL,
  medidas              VARCHAR(100) NOT NULL,
  id_almacen           INT NOT NULL,
  umbral_stock_bajo    INT NOT NULL DEFAULT 2,
  creado_en            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_almacen) REFERENCES almacenes(id_almacen)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Ítems por Colección (unidades individuales por número de serie)
-- ------------------------------------------------------------
CREATE TABLE items (
  numero_serie        VARCHAR(100) PRIMARY KEY,
  id_coleccion         INT NOT NULL,
  id_almacen           INT NOT NULL,
  fecha_ingreso        DATETIME NOT NULL,
  usuario_registra     INT NOT NULL,
  notas_entrada        TEXT,
  fecha_salida         DATETIME NULL,
  usuario_retira       INT NULL,
  responsable_recibe   VARCHAR(150),
  unidad_percibida     VARCHAR(150),
  posicion             VARCHAR(100),
  notas_salida         TEXT,
  FOREIGN KEY (id_coleccion) REFERENCES colecciones(id_coleccion),
  FOREIGN KEY (id_almacen) REFERENCES almacenes(id_almacen),
  FOREIGN KEY (usuario_registra) REFERENCES usuarios(id_usuario),
  FOREIGN KEY (usuario_retira) REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

CREATE INDEX idx_items_coleccion ON items(id_coleccion);
CREATE INDEX idx_items_almacen ON items(id_almacen);
CREATE INDEX idx_items_fecha_salida ON items(fecha_salida);

-- ------------------------------------------------------------
-- Historial / Log de operaciones (auditoría)
-- ------------------------------------------------------------
CREATE TABLE historial (
  id_historial      INT AUTO_INCREMENT PRIMARY KEY,
  fecha_operacion   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tipo_operacion    ENUM('ingreso', 'salida', 'desmarque_salida', 'edicion', 'eliminacion') NOT NULL,
  id_usuario        INT NOT NULL,
  numero_serie      VARCHAR(100) NOT NULL,
  id_coleccion      INT NOT NULL,
  detalle           TEXT,
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
  FOREIGN KEY (id_coleccion) REFERENCES colecciones(id_coleccion)
) ENGINE=InnoDB;

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
