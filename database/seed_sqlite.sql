-- ============================================================
-- SISTEMA DE INVENTARIO POR COLECCIONES
-- Datos de prueba - SQLite (Desarrollo)
-- Contraseña de prueba para todos los usuarios: "password123"
-- ============================================================

-- ------------------------------------------------------------
-- Usuarios
-- ------------------------------------------------------------
INSERT INTO usuarios (id_usuario, nombre, email, password_hash, departamento, rol) VALUES
(1, 'Mauricio Reyes',   'mauricio@empresa.com',  '$2y$12$rSWAOjP53pwF3iPvEN7dSOhBWuiIo7V6Gkmdah8QCmphzd/mMG7Ka', 'Dirección',      'super_admin'),
(2, 'Ana Torres',       'ana.torres@empresa.com','$2y$12$rSWAOjP53pwF3iPvEN7dSOhBWuiIo7V6Gkmdah8QCmphzd/mMG7Ka', 'Operaciones',    'admin_general'),
(3, 'Luis Medina',      'luis.medina@empresa.com','$2y$12$rSWAOjP53pwF3iPvEN7dSOhBWuiIo7V6Gkmdah8QCmphzd/mMG7Ka','Almacén Norte',  'admin_almacen'),
(4, 'Carla Pérez',      'carla.perez@empresa.com','$2y$12$rSWAOjP53pwF3iPvEN7dSOhBWuiIo7V6Gkmdah8QCmphzd/mMG7Ka','Almacén Sur',    'admin_almacen'),
(5, 'Jorge Ramírez',    'jorge.ramirez@empresa.com','$2y$12$rSWAOjP53pwF3iPvEN7dSOhBWuiIo7V6Gkmdah8QCmphzd/mMG7Ka','Almacén Norte','usuario_normal'),
(6, 'Sofía Vargas',     'sofia.vargas@empresa.com','$2y$12$rSWAOjP53pwF3iPvEN7dSOhBWuiIo7V6Gkmdah8QCmphzd/mMG7Ka','Almacén Sur',   'usuario_normal');

-- ------------------------------------------------------------
-- Almacenes
-- ------------------------------------------------------------
INSERT INTO almacenes (id_almacen, nombre, ubicacion) VALUES
(1, 'Almacén Norte', 'Zona Industrial Norte, Bodega 4'),
(2, 'Almacén Sur',   'Parque Industrial Sur, Bodega 12'),
(3, 'Almacén Centro','Vía Principal Centro, Bodega 2');

-- ------------------------------------------------------------
-- Usuario <-> Almacén
-- ------------------------------------------------------------
INSERT INTO usuario_almacenes (id_usuario, id_almacen) VALUES
(3, 1),
(4, 2),
(5, 1),
(6, 2);

-- ------------------------------------------------------------
-- Permisos configurables
-- ------------------------------------------------------------
INSERT INTO permisos_usuario (id_usuario, tipo, clave, permitido) VALUES
(5, 'vista', 'vista_entradas', 1),
(5, 'vista', 'vista_salidas', 1),
(5, 'vista', 'vista_inventario', 1),
(5, 'vista', 'vista_historial', 0),
(5, 'accion', 'accion_agregar_entrada', 1),
(5, 'accion', 'accion_eliminar_entrada', 0),
(5, 'accion', 'accion_marcar_salida', 1),
(5, 'accion', 'accion_desmarcar_salida', 0),
(6, 'vista', 'vista_entradas', 1),
(6, 'vista', 'vista_salidas', 1),
(6, 'vista', 'vista_inventario', 1),
(6, 'vista', 'vista_historial', 1),
(6, 'accion', 'accion_agregar_entrada', 1),
(6, 'accion', 'accion_eliminar_entrada', 0),
(6, 'accion', 'accion_marcar_salida', 1),
(6, 'accion', 'accion_desmarcar_salida', 0);

-- ------------------------------------------------------------
-- Colecciones (colección + almacén)
-- ------------------------------------------------------------
INSERT INTO colecciones (id_coleccion, descripcion, item, tipo, medidas, id_almacen, umbral_stock_bajo) VALUES
(1, 'Llanta de tracción 11 R 22.5',  'Llanta', 'Tracción', '11 R 22.5', 1, 2),
(2, 'Llanta de tracción 11 R 22.5',  'Llanta', 'Tracción', '11 R 22.5', 2, 2),
(3, 'Llanta de dirección 295/80 R22.5', 'Llanta', 'Dirección', '295/80 R22.5', 1, 2),
(4, 'Llanta de dirección 295/80 R22.5', 'Llanta', 'Dirección', '295/80 R22.5', 2, 2),
(5, 'Llanta de arrastre 285/75 R24.5', 'Llanta', 'Arrastre', '285/75 R24.5', 3, 2);

-- ------------------------------------------------------------
-- Ítems
-- ------------------------------------------------------------
INSERT INTO items (numero_serie, id_coleccion, id_almacen, fecha_ingreso, usuario_registra, notas_entrada,
                    fecha_salida, usuario_retira, responsable_recibe, unidad_percibida, posicion, notas_salida) VALUES
('SN-TRAC-0001', 1, 1, '2026-06-01 09:00:00', 3, 'Lote inicial de proveedor A', NULL, NULL, NULL, NULL, NULL, NULL),
('SN-TRAC-0002', 1, 1, '2026-06-01 09:00:00', 3, 'Lote inicial de proveedor A', '2026-06-15 14:30:00', 3, 'Pedro Gómez', 'Unidad T-204', 'Eje trasero izquierdo', 'Cambio por desgaste'),
('SN-TRAC-0003', 1, 1, '2026-06-05 10:15:00', 5, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('SN-TRAC-0101', 2, 2, '2026-06-02 08:30:00', 4, 'Lote inicial almacén sur', NULL, NULL, NULL, NULL, NULL, NULL),
('SN-DIR-0001',  3, 1, '2026-06-03 11:00:00', 3, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('SN-DIR-0002',  3, 1, '2026-06-03 11:00:00', 3, NULL, '2026-06-20 16:00:00', 5, 'Miguel Soto', 'Unidad T-115', 'Eje delantero derecho', NULL),
('SN-DIR-0101',  4, 2, '2026-06-04 13:45:00', 6, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('SN-ARR-0001',  5, 3, '2026-06-06 09:20:00', 2, 'Ingreso directo de fábrica', NULL, NULL, NULL, NULL, NULL, NULL),
-- Ítems adicionales de ejemplo (entradas y salidas variadas, ~75 días hacia atrás)
('SN-TRAC-0004', 1, 1, '2026-05-30 20:13:58', 5, 'Ingreso por devolución de taller', '2026-05-31 20:13:58', 3, 'Carlos Ruiz', 'Unidad T-317', 'Eje trasero izquierdo', 'Rotación programada'),
('SN-TRAC-0005', 1, 1, '2026-07-04 17:13:58', 3, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('SN-TRAC-0006', 1, 1, '2026-07-18 20:13:58', 5, 'Reposición de stock', NULL, NULL, NULL, NULL, NULL, NULL),
('SN-TRAC-0007', 1, 1, '2026-06-26 12:13:58', 3, 'Compra a proveedor B', '2026-07-21 12:13:58', 5, 'Miguel Soto', 'Unidad T-198', 'Eje trasero derecho', 'Reemplazo por daño'),
('SN-TRAC-0008', 1, 1, '2026-06-26 22:13:58', 5, 'Reposición de stock', NULL, NULL, NULL, NULL, NULL, NULL),
('SN-TRAC-0009', 1, 1, '2026-06-12 23:13:58', 3, 'Reposición de stock', NULL, NULL, NULL, NULL, NULL, NULL),
('SN-TRAC-0010', 1, 1, '2026-08-02 11:13:58', 5, 'Ingreso por rotación de inventario', '2026-08-05 11:13:58', 5, 'Laura Fernández', 'Unidad T-262', 'Eje trasero interno', 'Salida a unidad de reparto'),
('SN-TRAC-0011', 1, 1, '2026-06-29 14:13:58', 3, 'Reposición de stock', NULL, NULL, NULL, NULL, NULL, NULL),
('SN-TRAC-0012', 1, 1, '2026-07-21 13:13:58', 3, 'Compra a proveedor B', NULL, NULL, NULL, NULL, NULL, NULL),
('SN-TRAC-0013', 1, 1, '2026-06-26 23:13:58', 5, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('SN-TRAC-0102', 2, 2, '2026-07-21 19:13:58', 6, NULL, '2026-07-29 19:13:58', 6, 'Carlos Ruiz', 'Unidad T-237', 'Eje trasero interno', 'Rotación programada'),
('SN-TRAC-0103', 2, 2, '2026-07-20 16:13:58', 6, 'Ingreso por rotación de inventario', '2026-07-25 16:13:58', 6, 'Andrés Paredes', 'Unidad T-142', 'Eje delantero derecho', 'Solicitud de operaciones'),
('SN-TRAC-0104', 2, 2, '2026-07-25 20:13:58', 4, 'Recepción programada', NULL, NULL, NULL, NULL, NULL, NULL),
('SN-TRAC-0105', 2, 2, '2026-06-11 20:13:58', 6, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('SN-TRAC-0106', 2, 2, '2026-07-26 19:13:58', 4, 'Lote adicional solicitado', NULL, NULL, NULL, NULL, NULL, NULL),
('SN-TRAC-0107', 2, 2, '2026-07-27 20:13:58', 4, 'Reposición de stock', '2026-07-28 20:13:58', 6, 'Laura Fernández', 'Unidad T-138', 'Eje trasero interno', 'Reemplazo por daño'),
('SN-TRAC-0108', 2, 2, '2026-07-10 23:13:58', 6, 'Recepción programada', '2026-08-04 23:13:58', 4, 'Rosa Jiménez', 'Unidad T-184', 'Eje trasero izquierdo', 'Cambio por desgaste'),
('SN-TRAC-0109', 2, 2, '2026-07-17 13:13:58', 6, 'Lote adicional solicitado', '2026-07-30 13:13:58', 4, 'Rosa Jiménez', 'Unidad T-313', 'Refacción', 'Solicitud de operaciones'),
('SN-TRAC-0110', 2, 2, '2026-06-19 21:13:58', 4, 'Ingreso por devolución de taller', '2026-06-22 21:13:58', 4, 'Rosa Jiménez', 'Unidad T-298', 'Eje trasero derecho', 'Salida a unidad de reparto'),
('SN-TRAC-0111', 2, 2, '2026-08-02 22:13:58', 4, 'Ingreso por rotación de inventario', NULL, NULL, NULL, NULL, NULL, NULL),
('SN-DIR-0003', 3, 1, '2026-06-05 19:13:58', 5, NULL, '2026-06-11 19:13:58', 3, 'Pedro Gómez', 'Unidad T-136', 'Eje trasero izquierdo', NULL),
('SN-DIR-0004', 3, 1, '2026-05-28 13:13:58', 5, 'Ingreso por rotación de inventario', NULL, NULL, NULL, NULL, NULL, NULL),
('SN-DIR-0005', 3, 1, '2026-06-04 20:13:58', 5, 'Recepción programada', '2026-06-23 20:13:58', 5, 'Miguel Soto', 'Unidad T-158', 'Eje trasero izquierdo', 'Salida a unidad de reparto'),
('SN-DIR-0006', 3, 1, '2026-06-05 17:13:58', 5, 'Compra a proveedor B', '2026-06-26 17:13:58', 3, 'Miguel Soto', 'Unidad T-365', 'Eje trasero interno', 'Mantenimiento preventivo'),
('SN-DIR-0007', 3, 1, '2026-07-21 21:13:58', 3, 'Compra a proveedor B', '2026-07-22 21:13:58', 5, 'Miguel Soto', 'Unidad T-152', 'Eje trasero interno', 'Salida a unidad de reparto'),
('SN-DIR-0008', 3, 1, '2026-06-19 20:13:58', 5, 'Reposición de stock', NULL, NULL, NULL, NULL, NULL, NULL),
('SN-DIR-0009', 3, 1, '2026-07-23 18:13:58', 3, 'Ingreso por rotación de inventario', '2026-07-25 18:13:58', 5, 'Rosa Jiménez', 'Unidad T-302', 'Eje delantero derecho', 'Rotación programada'),
('SN-DIR-0010', 3, 1, '2026-06-09 18:13:58', 5, 'Recepción programada', '2026-06-28 18:13:58', 5, 'Laura Fernández', 'Unidad T-299', 'Refacción', 'Reemplazo por daño'),
('SN-DIR-0011', 3, 1, '2026-05-29 22:13:58', 3, NULL, '2026-06-02 22:13:58', 5, 'Laura Fernández', 'Unidad T-225', 'Eje delantero derecho', 'Reemplazo por daño'),
('SN-DIR-0012', 3, 1, '2026-06-11 11:13:58', 3, 'Compra a proveedor B', '2026-06-26 11:13:58', 5, 'Laura Fernández', 'Unidad T-327', 'Eje delantero derecho', 'Solicitud de operaciones'),
('SN-DIR-0102', 4, 2, '2026-06-15 12:13:58', 6, 'Compra a proveedor B', NULL, NULL, NULL, NULL, NULL, NULL),
('SN-DIR-0103', 4, 2, '2026-07-28 19:13:58', 4, 'Lote adicional solicitado', '2026-08-05 19:13:58', 6, 'Laura Fernández', 'Unidad T-151', 'Eje trasero derecho', 'Cambio por desgaste'),
('SN-DIR-0104', 4, 2, '2026-07-29 15:13:58', 6, 'Compra a proveedor B', NULL, NULL, NULL, NULL, NULL, NULL),
('SN-DIR-0105', 4, 2, '2026-06-29 12:13:58', 6, 'Ingreso por devolución de taller', NULL, NULL, NULL, NULL, NULL, NULL),
('SN-DIR-0106', 4, 2, '2026-06-24 23:13:58', 4, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('SN-DIR-0107', 4, 2, '2026-07-29 23:13:58', 6, 'Recepción programada', '2026-08-05 23:13:58', 4, 'Carlos Ruiz', 'Unidad T-220', 'Eje trasero derecho', 'Mantenimiento preventivo'),
('SN-DIR-0108', 4, 2, '2026-08-04 23:13:58', 6, 'Recepción programada', NULL, NULL, NULL, NULL, NULL, NULL),
('SN-DIR-0109', 4, 2, '2026-06-14 17:13:58', 4, NULL, '2026-06-29 17:13:58', 6, 'Rosa Jiménez', 'Unidad T-386', 'Eje trasero derecho', 'Reemplazo por daño'),
('SN-DIR-0110', 4, 2, '2026-07-04 16:13:58', 6, 'Reposición de stock', NULL, NULL, NULL, NULL, NULL, NULL),
('SN-DIR-0111', 4, 2, '2026-07-12 14:13:58', 4, 'Lote adicional solicitado', '2026-07-17 14:13:58', 4, 'Diana Ortiz', 'Unidad T-202', 'Eje delantero derecho', 'Reemplazo por daño'),
('SN-ARR-0002', 5, 3, '2026-06-21 21:13:58', 1, 'Ingreso por devolución de taller', '2026-07-12 21:13:58', 1, 'Laura Fernández', 'Unidad T-137', 'Eje trasero derecho', 'Cambio por desgaste'),
('SN-ARR-0003', 5, 3, '2026-07-03 12:13:58', 1, 'Recepción programada', NULL, NULL, NULL, NULL, NULL, NULL),
('SN-ARR-0004', 5, 3, '2026-06-28 18:13:58', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('SN-ARR-0005', 5, 3, '2026-06-19 22:13:58', 1, 'Reposición de stock', NULL, NULL, NULL, NULL, NULL, NULL),
('SN-ARR-0006', 5, 3, '2026-05-28 20:13:58', 1, NULL, '2026-06-05 20:13:58', 1, 'Diana Ortiz', 'Unidad T-208', 'Eje trasero interno', 'Cambio por desgaste'),
('SN-ARR-0007', 5, 3, '2026-06-23 18:13:58', 2, 'Recepción programada', '2026-07-04 18:13:58', 2, 'Pedro Gómez', 'Unidad T-220', 'Eje delantero derecho', 'Salida a unidad de reparto'),
('SN-ARR-0008', 5, 3, '2026-07-08 14:13:58', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('SN-ARR-0009', 5, 3, '2026-07-22 12:13:58', 2, 'Lote adicional solicitado', NULL, NULL, NULL, NULL, NULL, NULL),
('SN-ARR-0010', 5, 3, '2026-05-25 15:13:58', 2, 'Recepción programada', NULL, NULL, NULL, NULL, NULL, NULL),
('SN-ARR-0011', 5, 3, '2026-06-29 18:13:58', 1, 'Lote adicional solicitado', NULL, NULL, NULL, NULL, NULL, NULL);

-- ------------------------------------------------------------
-- Historial
-- ------------------------------------------------------------
INSERT INTO historial (fecha_operacion, tipo_operacion, id_usuario, numero_serie, id_coleccion, detalle) VALUES
('2026-06-01 09:00:00', 'ingreso', 3, 'SN-TRAC-0001', 1, 'Ingreso de llanta al Almacén Norte'),
('2026-06-01 09:00:00', 'ingreso', 3, 'SN-TRAC-0002', 1, 'Ingreso de llanta al Almacén Norte'),
('2026-06-15 14:30:00', 'salida',  3, 'SN-TRAC-0002', 1, 'Salida a Unidad T-204, eje trasero izquierdo'),
('2026-06-05 10:15:00', 'ingreso', 5, 'SN-TRAC-0003', 1, 'Ingreso de llanta al Almacén Norte'),
('2026-06-20 16:00:00', 'salida',  5, 'SN-DIR-0002', 3, 'Salida a Unidad T-115, eje delantero derecho'),
('2026-05-30 20:13:58', 'ingreso', 5, 'SN-TRAC-0004', 1, 'Ingreso registrado: SN-TRAC-0004'),
('2026-05-31 20:13:58', 'salida', 3, 'SN-TRAC-0004', 1, 'Salida registrada: SN-TRAC-0004'),
('2026-07-04 17:13:58', 'ingreso', 3, 'SN-TRAC-0005', 1, 'Ingreso registrado: SN-TRAC-0005'),
('2026-07-18 20:13:58', 'ingreso', 5, 'SN-TRAC-0006', 1, 'Ingreso registrado: SN-TRAC-0006'),
('2026-06-26 12:13:58', 'ingreso', 3, 'SN-TRAC-0007', 1, 'Ingreso registrado: SN-TRAC-0007'),
('2026-07-21 12:13:58', 'salida', 5, 'SN-TRAC-0007', 1, 'Salida registrada: SN-TRAC-0007'),
('2026-06-26 22:13:58', 'ingreso', 5, 'SN-TRAC-0008', 1, 'Ingreso registrado: SN-TRAC-0008'),
('2026-06-12 23:13:58', 'ingreso', 3, 'SN-TRAC-0009', 1, 'Ingreso registrado: SN-TRAC-0009'),
('2026-08-02 11:13:58', 'ingreso', 5, 'SN-TRAC-0010', 1, 'Ingreso registrado: SN-TRAC-0010'),
('2026-08-05 11:13:58', 'salida', 5, 'SN-TRAC-0010', 1, 'Salida registrada: SN-TRAC-0010'),
('2026-06-29 14:13:58', 'ingreso', 3, 'SN-TRAC-0011', 1, 'Ingreso registrado: SN-TRAC-0011'),
('2026-07-21 13:13:58', 'ingreso', 3, 'SN-TRAC-0012', 1, 'Ingreso registrado: SN-TRAC-0012'),
('2026-06-26 23:13:58', 'ingreso', 5, 'SN-TRAC-0013', 1, 'Ingreso registrado: SN-TRAC-0013'),
('2026-07-21 19:13:58', 'ingreso', 6, 'SN-TRAC-0102', 2, 'Ingreso registrado: SN-TRAC-0102'),
('2026-07-29 19:13:58', 'salida', 6, 'SN-TRAC-0102', 2, 'Salida registrada: SN-TRAC-0102'),
('2026-07-20 16:13:58', 'ingreso', 6, 'SN-TRAC-0103', 2, 'Ingreso registrado: SN-TRAC-0103'),
('2026-07-25 16:13:58', 'salida', 6, 'SN-TRAC-0103', 2, 'Salida registrada: SN-TRAC-0103'),
('2026-07-25 20:13:58', 'ingreso', 4, 'SN-TRAC-0104', 2, 'Ingreso registrado: SN-TRAC-0104'),
('2026-06-11 20:13:58', 'ingreso', 6, 'SN-TRAC-0105', 2, 'Ingreso registrado: SN-TRAC-0105'),
('2026-07-26 19:13:58', 'ingreso', 4, 'SN-TRAC-0106', 2, 'Ingreso registrado: SN-TRAC-0106'),
('2026-07-27 20:13:58', 'ingreso', 4, 'SN-TRAC-0107', 2, 'Ingreso registrado: SN-TRAC-0107'),
('2026-07-28 20:13:58', 'salida', 6, 'SN-TRAC-0107', 2, 'Salida registrada: SN-TRAC-0107'),
('2026-07-10 23:13:58', 'ingreso', 6, 'SN-TRAC-0108', 2, 'Ingreso registrado: SN-TRAC-0108'),
('2026-08-04 23:13:58', 'salida', 4, 'SN-TRAC-0108', 2, 'Salida registrada: SN-TRAC-0108'),
('2026-07-17 13:13:58', 'ingreso', 6, 'SN-TRAC-0109', 2, 'Ingreso registrado: SN-TRAC-0109'),
('2026-07-30 13:13:58', 'salida', 4, 'SN-TRAC-0109', 2, 'Salida registrada: SN-TRAC-0109'),
('2026-06-19 21:13:58', 'ingreso', 4, 'SN-TRAC-0110', 2, 'Ingreso registrado: SN-TRAC-0110'),
('2026-06-22 21:13:58', 'salida', 4, 'SN-TRAC-0110', 2, 'Salida registrada: SN-TRAC-0110'),
('2026-08-02 22:13:58', 'ingreso', 4, 'SN-TRAC-0111', 2, 'Ingreso registrado: SN-TRAC-0111'),
('2026-06-05 19:13:58', 'ingreso', 5, 'SN-DIR-0003', 3, 'Ingreso registrado: SN-DIR-0003'),
('2026-06-11 19:13:58', 'salida', 3, 'SN-DIR-0003', 3, 'Salida registrada: SN-DIR-0003'),
('2026-05-28 13:13:58', 'ingreso', 5, 'SN-DIR-0004', 3, 'Ingreso registrado: SN-DIR-0004'),
('2026-06-04 20:13:58', 'ingreso', 5, 'SN-DIR-0005', 3, 'Ingreso registrado: SN-DIR-0005'),
('2026-06-23 20:13:58', 'salida', 5, 'SN-DIR-0005', 3, 'Salida registrada: SN-DIR-0005'),
('2026-06-05 17:13:58', 'ingreso', 5, 'SN-DIR-0006', 3, 'Ingreso registrado: SN-DIR-0006'),
('2026-06-26 17:13:58', 'salida', 3, 'SN-DIR-0006', 3, 'Salida registrada: SN-DIR-0006'),
('2026-07-21 21:13:58', 'ingreso', 3, 'SN-DIR-0007', 3, 'Ingreso registrado: SN-DIR-0007'),
('2026-07-22 21:13:58', 'salida', 5, 'SN-DIR-0007', 3, 'Salida registrada: SN-DIR-0007'),
('2026-06-19 20:13:58', 'ingreso', 5, 'SN-DIR-0008', 3, 'Ingreso registrado: SN-DIR-0008'),
('2026-07-23 18:13:58', 'ingreso', 3, 'SN-DIR-0009', 3, 'Ingreso registrado: SN-DIR-0009'),
('2026-07-25 18:13:58', 'salida', 5, 'SN-DIR-0009', 3, 'Salida registrada: SN-DIR-0009'),
('2026-06-09 18:13:58', 'ingreso', 5, 'SN-DIR-0010', 3, 'Ingreso registrado: SN-DIR-0010'),
('2026-06-28 18:13:58', 'salida', 5, 'SN-DIR-0010', 3, 'Salida registrada: SN-DIR-0010'),
('2026-05-29 22:13:58', 'ingreso', 3, 'SN-DIR-0011', 3, 'Ingreso registrado: SN-DIR-0011'),
('2026-06-02 22:13:58', 'salida', 5, 'SN-DIR-0011', 3, 'Salida registrada: SN-DIR-0011'),
('2026-06-11 11:13:58', 'ingreso', 3, 'SN-DIR-0012', 3, 'Ingreso registrado: SN-DIR-0012'),
('2026-06-26 11:13:58', 'salida', 5, 'SN-DIR-0012', 3, 'Salida registrada: SN-DIR-0012'),
('2026-06-15 12:13:58', 'ingreso', 6, 'SN-DIR-0102', 4, 'Ingreso registrado: SN-DIR-0102'),
('2026-07-28 19:13:58', 'ingreso', 4, 'SN-DIR-0103', 4, 'Ingreso registrado: SN-DIR-0103'),
('2026-08-05 19:13:58', 'salida', 6, 'SN-DIR-0103', 4, 'Salida registrada: SN-DIR-0103'),
('2026-07-29 15:13:58', 'ingreso', 6, 'SN-DIR-0104', 4, 'Ingreso registrado: SN-DIR-0104'),
('2026-06-29 12:13:58', 'ingreso', 6, 'SN-DIR-0105', 4, 'Ingreso registrado: SN-DIR-0105'),
('2026-06-24 23:13:58', 'ingreso', 4, 'SN-DIR-0106', 4, 'Ingreso registrado: SN-DIR-0106'),
('2026-07-29 23:13:58', 'ingreso', 6, 'SN-DIR-0107', 4, 'Ingreso registrado: SN-DIR-0107'),
('2026-08-05 23:13:58', 'salida', 4, 'SN-DIR-0107', 4, 'Salida registrada: SN-DIR-0107'),
('2026-08-04 23:13:58', 'ingreso', 6, 'SN-DIR-0108', 4, 'Ingreso registrado: SN-DIR-0108'),
('2026-06-14 17:13:58', 'ingreso', 4, 'SN-DIR-0109', 4, 'Ingreso registrado: SN-DIR-0109'),
('2026-06-29 17:13:58', 'salida', 6, 'SN-DIR-0109', 4, 'Salida registrada: SN-DIR-0109'),
('2026-07-04 16:13:58', 'ingreso', 6, 'SN-DIR-0110', 4, 'Ingreso registrado: SN-DIR-0110'),
('2026-07-12 14:13:58', 'ingreso', 4, 'SN-DIR-0111', 4, 'Ingreso registrado: SN-DIR-0111'),
('2026-07-17 14:13:58', 'salida', 4, 'SN-DIR-0111', 4, 'Salida registrada: SN-DIR-0111'),
('2026-06-21 21:13:58', 'ingreso', 1, 'SN-ARR-0002', 5, 'Ingreso registrado: SN-ARR-0002'),
('2026-07-12 21:13:58', 'salida', 1, 'SN-ARR-0002', 5, 'Salida registrada: SN-ARR-0002'),
('2026-07-03 12:13:58', 'ingreso', 1, 'SN-ARR-0003', 5, 'Ingreso registrado: SN-ARR-0003'),
('2026-06-28 18:13:58', 'ingreso', 1, 'SN-ARR-0004', 5, 'Ingreso registrado: SN-ARR-0004'),
('2026-06-19 22:13:58', 'ingreso', 1, 'SN-ARR-0005', 5, 'Ingreso registrado: SN-ARR-0005'),
('2026-05-28 20:13:58', 'ingreso', 1, 'SN-ARR-0006', 5, 'Ingreso registrado: SN-ARR-0006'),
('2026-06-05 20:13:58', 'salida', 1, 'SN-ARR-0006', 5, 'Salida registrada: SN-ARR-0006'),
('2026-06-23 18:13:58', 'ingreso', 2, 'SN-ARR-0007', 5, 'Ingreso registrado: SN-ARR-0007'),
('2026-07-04 18:13:58', 'salida', 2, 'SN-ARR-0007', 5, 'Salida registrada: SN-ARR-0007'),
('2026-07-08 14:13:58', 'ingreso', 1, 'SN-ARR-0008', 5, 'Ingreso registrado: SN-ARR-0008'),
('2026-07-22 12:13:58', 'ingreso', 2, 'SN-ARR-0009', 5, 'Ingreso registrado: SN-ARR-0009'),
('2026-05-25 15:13:58', 'ingreso', 2, 'SN-ARR-0010', 5, 'Ingreso registrado: SN-ARR-0010'),
('2026-06-29 18:13:58', 'ingreso', 1, 'SN-ARR-0011', 5, 'Ingreso registrado: SN-ARR-0011');
