-- Esquema inicial de Fluxo generado desde app/models.
-- Ejecucion: mysql -u <usuario> -p < FLUXO.sql
CREATE DATABASE IF NOT EXISTS `fluxo` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `fluxo`;

CREATE TABLE IF NOT EXISTS categorias (
	categoria_id INTEGER NOT NULL AUTO_INCREMENT,
	nombre_categoria VARCHAR(255),
	descripcion VARCHAR(255),
	estado INTEGER,
	creado_en DATETIME DEFAULT (now()),
	PRIMARY KEY (categoria_id),
	UNIQUE (nombre_categoria)
);
CREATE INDEX ix_categorias_categoria_id ON categorias (categoria_id);

CREATE TABLE IF NOT EXISTS clientes (
	cliente_id INTEGER NOT NULL AUTO_INCREMENT,
	documento VARCHAR(20),
	nombres VARCHAR(255),
	telefono VARCHAR(20),
	email VARCHAR(255),
	direccion VARCHAR(255),
	estado INTEGER,
	creado_en DATETIME DEFAULT (now()),
	PRIMARY KEY (cliente_id),
	UNIQUE (documento)
);
CREATE INDEX ix_clientes_cliente_id ON clientes (cliente_id);
CREATE INDEX ix_clientes_creado_en ON clientes (creado_en);

CREATE TABLE IF NOT EXISTS comprobante_series (
	comprobante_serie_id INTEGER NOT NULL AUTO_INCREMENT,
	tipo_comprobante VARCHAR(50) NOT NULL,
	serie VARCHAR(10) NOT NULL,
	correlativo_actual INTEGER NOT NULL,
	estado INTEGER NOT NULL,
	creado_en DATETIME DEFAULT (now()),
	PRIMARY KEY (comprobante_serie_id),
	UNIQUE (serie)
);
CREATE INDEX ix_comprobante_series_comprobante_serie_id ON comprobante_series (comprobante_serie_id);

CREATE TABLE IF NOT EXISTS proveedores (
	proveedor_id INTEGER NOT NULL AUTO_INCREMENT,
	ruc VARCHAR(20),
	razon_social VARCHAR(255),
	telefono VARCHAR(20),
	email VARCHAR(255),
	direccion VARCHAR(255),
	estado INTEGER,
	creado_en DATETIME DEFAULT (now()),
	PRIMARY KEY (proveedor_id),
	UNIQUE (ruc)
);
CREATE INDEX ix_proveedores_creado_en ON proveedores (creado_en);
CREATE INDEX ix_proveedores_proveedor_id ON proveedores (proveedor_id);

CREATE TABLE IF NOT EXISTS roles (
	rol_id INTEGER NOT NULL AUTO_INCREMENT,
	nombre_rol VARCHAR(50) NOT NULL,
	es_jefatura INTEGER,
	estado INTEGER,
	creado_en DATETIME DEFAULT (now()),
	PRIMARY KEY (rol_id),
	UNIQUE (nombre_rol)
);
CREATE INDEX ix_roles_rol_id ON roles (rol_id);

CREATE TABLE IF NOT EXISTS usuarios (
	usuario_id INTEGER NOT NULL AUTO_INCREMENT,
	rol_id INTEGER,
	nombre_completo VARCHAR(255),
	email VARCHAR(255),
	password_hash VARCHAR(255),
	estado INTEGER,
	creado_en DATETIME DEFAULT (now()),
	PRIMARY KEY (usuario_id),
	UNIQUE (email)
);
CREATE INDEX ix_usuarios_usuario_id ON usuarios (usuario_id);

CREATE TABLE IF NOT EXISTS caja (
	caja_id INTEGER NOT NULL AUTO_INCREMENT,
	usuario_id INTEGER,
	fecha_apertura DATETIME DEFAULT (now()),
	fecha_cierre DATETIME,
	monto_apertura FLOAT,
	monto_cierre FLOAT,
	estado VARCHAR(20),
	PRIMARY KEY (caja_id),
	FOREIGN KEY(usuario_id) REFERENCES usuarios (usuario_id)
);
CREATE INDEX ix_caja_caja_id ON caja (caja_id);
CREATE INDEX ix_caja_fecha_apertura ON caja (fecha_apertura);
CREATE INDEX ix_caja_usuario_id ON caja (usuario_id);

CREATE TABLE IF NOT EXISTS ingresos_hdr (
	ingreso_hdr_id INTEGER NOT NULL AUTO_INCREMENT,
	proveedor_id INTEGER,
	comprobante_serie_id INTEGER,
	tipo_comprobante VARCHAR(50),
	serie VARCHAR(20),
	numero VARCHAR(20),
	nro_comprobante VARCHAR(50),
	fecha_compra DATETIME,
	fecha_registro DATETIME DEFAULT (now()),
	total FLOAT,
	usuario_id INTEGER,
	estado VARCHAR(20),
	PRIMARY KEY (ingreso_hdr_id),
	FOREIGN KEY(proveedor_id) REFERENCES proveedores (proveedor_id),
	FOREIGN KEY(comprobante_serie_id) REFERENCES comprobante_series (comprobante_serie_id),
	FOREIGN KEY(usuario_id) REFERENCES usuarios (usuario_id)
);
CREATE INDEX ix_ingresos_hdr_fecha_compra ON ingresos_hdr (fecha_compra);
CREATE INDEX ix_ingresos_hdr_fecha_registro ON ingresos_hdr (fecha_registro);
CREATE INDEX ix_ingresos_hdr_ingreso_hdr_id ON ingresos_hdr (ingreso_hdr_id);
CREATE INDEX ix_ingresos_hdr_proveedor_id ON ingresos_hdr (proveedor_id);
CREATE INDEX ix_ingresos_hdr_usuario_id ON ingresos_hdr (usuario_id);

CREATE TABLE IF NOT EXISTS productos (
	producto_id INTEGER NOT NULL AUTO_INCREMENT,
	categoria_id INTEGER,
	codigo_barras VARCHAR(100),
	nombre_producto VARCHAR(255),
	precio_compra FLOAT,
	precio_venta FLOAT,
	maneja_vencimiento INTEGER,
	stock_actual INTEGER,
	stock_minimo INTEGER,
	unidad_medida VARCHAR(50),
	estado INTEGER,
	creado_en DATETIME DEFAULT (now()),
	PRIMARY KEY (producto_id),
	FOREIGN KEY(categoria_id) REFERENCES categorias (categoria_id),
	UNIQUE (codigo_barras)
);
CREATE INDEX ix_productos_categoria_id ON productos (categoria_id);
CREATE INDEX ix_productos_creado_en ON productos (creado_en);
CREATE INDEX ix_productos_producto_id ON productos (producto_id);

CREATE TABLE IF NOT EXISTS roles_permisos (
	rol_id INTEGER NOT NULL,
	permiso_key VARCHAR(100) NOT NULL,
	PRIMARY KEY (rol_id, permiso_key),
	FOREIGN KEY(rol_id) REFERENCES roles (rol_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS caja_movimientos (
	caja_movimiento_id INTEGER NOT NULL AUTO_INCREMENT,
	caja_id INTEGER,
	tipo VARCHAR(20),
	monto FLOAT,
	descripcion VARCHAR(255),
	referencia_id INTEGER,
	fecha DATETIME DEFAULT (now()),
	PRIMARY KEY (caja_movimiento_id),
	FOREIGN KEY(caja_id) REFERENCES caja (caja_id)
);
CREATE INDEX ix_caja_movimientos_caja_id ON caja_movimientos (caja_id);
CREATE INDEX ix_caja_movimientos_caja_movimiento_id ON caja_movimientos (caja_movimiento_id);
CREATE INDEX ix_caja_movimientos_fecha ON caja_movimientos (fecha);

CREATE TABLE IF NOT EXISTS lotes (
	lote_id INTEGER NOT NULL AUTO_INCREMENT,
	producto_id INTEGER,
	fecha_vencimiento DATETIME,
	nro_lote VARCHAR(50),
	stock_lote INTEGER,
	fecha_ingreso DATETIME DEFAULT (now()),
	estado INTEGER,
	PRIMARY KEY (lote_id),
	FOREIGN KEY(producto_id) REFERENCES productos (producto_id)
);
CREATE INDEX ix_lotes_fecha_ingreso ON lotes (fecha_ingreso);
CREATE INDEX ix_lotes_lote_id ON lotes (lote_id);
CREATE INDEX ix_lotes_producto_id ON lotes (producto_id);

CREATE TABLE IF NOT EXISTS ventas_hdr (
	venta_hdr_id INTEGER NOT NULL AUTO_INCREMENT,
	cliente_id INTEGER,
	fecha_venta DATETIME DEFAULT (now()),
	usuario_id INTEGER,
	caja_id INTEGER,
	comprobante_serie_id INTEGER,
	subtotal FLOAT,
	igv FLOAT,
	total FLOAT,
	estado VARCHAR(20),
	tipo_comprobante VARCHAR(50),
	serie VARCHAR(10),
	numero VARCHAR(20),
	nro_comprobante VARCHAR(50),
	PRIMARY KEY (venta_hdr_id),
	FOREIGN KEY(cliente_id) REFERENCES clientes (cliente_id),
	FOREIGN KEY(usuario_id) REFERENCES usuarios (usuario_id),
	FOREIGN KEY(caja_id) REFERENCES caja (caja_id),
	FOREIGN KEY(comprobante_serie_id) REFERENCES comprobante_series (comprobante_serie_id)
);
CREATE INDEX ix_ventas_hdr_cliente_id ON ventas_hdr (cliente_id);
CREATE INDEX ix_ventas_hdr_fecha_venta ON ventas_hdr (fecha_venta);
CREATE INDEX ix_ventas_hdr_nro_comprobante ON ventas_hdr (nro_comprobante);
CREATE INDEX ix_ventas_hdr_serie ON ventas_hdr (serie);
CREATE INDEX ix_ventas_hdr_tipo_comprobante ON ventas_hdr (tipo_comprobante);
CREATE INDEX ix_ventas_hdr_usuario_id ON ventas_hdr (usuario_id);
CREATE INDEX ix_ventas_hdr_venta_hdr_id ON ventas_hdr (venta_hdr_id);

CREATE TABLE IF NOT EXISTS ajustes_inventario (
	ajuste_inventario_id INTEGER NOT NULL AUTO_INCREMENT,
	producto_id INTEGER NOT NULL,
	lote_id INTEGER,
	usuario_solicitante_id INTEGER NOT NULL,
	usuario_aprobador_id INTEGER,
	tipo_ajuste VARCHAR(50) NOT NULL,
	cantidad NUMERIC(10, 2) NOT NULL,
	motivo VARCHAR(50) NOT NULL,
	observacion VARCHAR(255),
	estado VARCHAR(50) NOT NULL,
	fecha_solicitud DATETIME NOT NULL DEFAULT (now()),
	fecha_aprobacion DATETIME,
	PRIMARY KEY (ajuste_inventario_id),
	FOREIGN KEY(producto_id) REFERENCES productos (producto_id),
	FOREIGN KEY(lote_id) REFERENCES lotes (lote_id),
	FOREIGN KEY(usuario_solicitante_id) REFERENCES usuarios (usuario_id),
	FOREIGN KEY(usuario_aprobador_id) REFERENCES usuarios (usuario_id)
);
CREATE INDEX ix_ajustes_inventario_ajuste_inventario_id ON ajustes_inventario (ajuste_inventario_id);
CREATE INDEX ix_ajustes_inventario_estado ON ajustes_inventario (estado);
CREATE INDEX ix_ajustes_inventario_lote_id ON ajustes_inventario (lote_id);
CREATE INDEX ix_ajustes_inventario_producto_id ON ajustes_inventario (producto_id);
CREATE INDEX ix_ajustes_inventario_usuario_aprobador_id ON ajustes_inventario (usuario_aprobador_id);
CREATE INDEX ix_ajustes_inventario_usuario_solicitante_id ON ajustes_inventario (usuario_solicitante_id);

CREATE TABLE IF NOT EXISTS devoluciones_hdr (
	devolucion_hdr_id INTEGER NOT NULL AUTO_INCREMENT,
	tipo_devolucion VARCHAR(10) NOT NULL,
	venta_hdr_id INTEGER,
	ingreso_hdr_id INTEGER,
	usuario_id INTEGER NOT NULL,
	motivo VARCHAR(255) NOT NULL,
	fecha_registro DATETIME DEFAULT (now()),
	estado VARCHAR(20),
	PRIMARY KEY (devolucion_hdr_id),
	FOREIGN KEY(venta_hdr_id) REFERENCES ventas_hdr (venta_hdr_id),
	FOREIGN KEY(ingreso_hdr_id) REFERENCES ingresos_hdr (ingreso_hdr_id),
	FOREIGN KEY(usuario_id) REFERENCES usuarios (usuario_id)
);
CREATE INDEX ix_devoluciones_hdr_devolucion_hdr_id ON devoluciones_hdr (devolucion_hdr_id);

CREATE TABLE IF NOT EXISTS ingresos_dtl (
	ingreso_dtl_id INTEGER NOT NULL AUTO_INCREMENT,
	ingreso_hdr_id INTEGER,
	producto_id INTEGER,
	lote_id INTEGER,
	cantidad INTEGER,
	precio_costo FLOAT,
	subtotal FLOAT,
	PRIMARY KEY (ingreso_dtl_id),
	FOREIGN KEY(ingreso_hdr_id) REFERENCES ingresos_hdr (ingreso_hdr_id),
	FOREIGN KEY(producto_id) REFERENCES productos (producto_id),
	FOREIGN KEY(lote_id) REFERENCES lotes (lote_id)
);
CREATE INDEX ix_ingresos_dtl_ingreso_dtl_id ON ingresos_dtl (ingreso_dtl_id);
CREATE INDEX ix_ingresos_dtl_ingreso_hdr_id ON ingresos_dtl (ingreso_hdr_id);
CREATE INDEX ix_ingresos_dtl_lote_id ON ingresos_dtl (lote_id);
CREATE INDEX ix_ingresos_dtl_producto_id ON ingresos_dtl (producto_id);

CREATE TABLE IF NOT EXISTS kardex_movimientos (
	kardex_movimiento_id BIGINT NOT NULL AUTO_INCREMENT,
	producto_id INTEGER,
	lote_id INTEGER,
	tipo_movimiento VARCHAR(20),
	referencia_tipo VARCHAR(50),
	referencia_id INTEGER,
	cantidad INTEGER,
	stock_anterior INTEGER,
	stock_posterior INTEGER,
	usuario_id INTEGER,
	observacion VARCHAR(255),
	fecha_registro DATETIME DEFAULT (now()),
	PRIMARY KEY (kardex_movimiento_id),
	FOREIGN KEY(producto_id) REFERENCES productos (producto_id),
	FOREIGN KEY(lote_id) REFERENCES lotes (lote_id),
	FOREIGN KEY(usuario_id) REFERENCES usuarios (usuario_id)
);
CREATE INDEX ix_kardex_movimientos_fecha_registro ON kardex_movimientos (fecha_registro);
CREATE INDEX ix_kardex_movimientos_kardex_movimiento_id ON kardex_movimientos (kardex_movimiento_id);
CREATE INDEX ix_kardex_movimientos_producto_id ON kardex_movimientos (producto_id);
CREATE INDEX ix_kardex_movimientos_usuario_id ON kardex_movimientos (usuario_id);

CREATE TABLE IF NOT EXISTS ventas_dtl (
	venta_dtl_id INTEGER NOT NULL AUTO_INCREMENT,
	venta_hdr_id INTEGER,
	producto_id INTEGER,
	lote_id INTEGER,
	cantidad INTEGER,
	precio_venta FLOAT,
	subtotal FLOAT,
	PRIMARY KEY (venta_dtl_id),
	FOREIGN KEY(venta_hdr_id) REFERENCES ventas_hdr (venta_hdr_id),
	FOREIGN KEY(producto_id) REFERENCES productos (producto_id),
	FOREIGN KEY(lote_id) REFERENCES lotes (lote_id)
);
CREATE INDEX ix_ventas_dtl_lote_id ON ventas_dtl (lote_id);
CREATE INDEX ix_ventas_dtl_producto_id ON ventas_dtl (producto_id);
CREATE INDEX ix_ventas_dtl_venta_dtl_id ON ventas_dtl (venta_dtl_id);
CREATE INDEX ix_ventas_dtl_venta_hdr_id ON ventas_dtl (venta_hdr_id);

CREATE TABLE IF NOT EXISTS ventas_pagos (
	venta_pago_id INTEGER NOT NULL AUTO_INCREMENT,
	venta_hdr_id INTEGER,
	metodo_pago VARCHAR(50),
	id_transaccion_api VARCHAR(100),
	proveedor_pago VARCHAR(50),
	monto FLOAT,
	estado_pago VARCHAR(20),
	fecha_pago DATETIME DEFAULT (now()),
	PRIMARY KEY (venta_pago_id),
	FOREIGN KEY(venta_hdr_id) REFERENCES ventas_hdr (venta_hdr_id)
);
CREATE INDEX ix_ventas_pagos_venta_hdr_id ON ventas_pagos (venta_hdr_id);
CREATE INDEX ix_ventas_pagos_venta_pago_id ON ventas_pagos (venta_pago_id);

CREATE TABLE IF NOT EXISTS devoluciones_dtl (
	devolucion_dtl_id INTEGER NOT NULL AUTO_INCREMENT,
	devolucion_hdr_id INTEGER NOT NULL,
	producto_id INTEGER NOT NULL,
	lote_id INTEGER,
	cantidad NUMERIC(10, 2) NOT NULL,
	precio_unitario NUMERIC(10, 2) NOT NULL,
	subtotal NUMERIC(10, 2),
	PRIMARY KEY (devolucion_dtl_id),
	FOREIGN KEY(devolucion_hdr_id) REFERENCES devoluciones_hdr (devolucion_hdr_id) ON DELETE CASCADE,
	FOREIGN KEY(producto_id) REFERENCES productos (producto_id),
	FOREIGN KEY(lote_id) REFERENCES lotes (lote_id)
);
CREATE INDEX ix_devoluciones_dtl_devolucion_dtl_id ON devoluciones_dtl (devolucion_dtl_id);

-- Los modelos marcan estos subtotales como generados por la base de datos.
ALTER TABLE `ventas_dtl` MODIFY COLUMN `subtotal` FLOAT GENERATED ALWAYS AS (`cantidad` * `precio_venta`) STORED;
ALTER TABLE `ingresos_dtl` MODIFY COLUMN `subtotal` FLOAT GENERATED ALWAYS AS (`cantidad` * `precio_costo`) STORED;

-- Roles y permisos iniciales usados por la aplicacion.
INSERT IGNORE INTO `roles` (`rol_id`, `nombre_rol`, `es_jefatura`, `estado`) VALUES (1, 'Administrador', 1, 1), (2, 'Vendedor', 0, 1), (3, 'Almacén', 0, 1);
INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_key`) VALUES
(1, 'modulo:dashboard'), (1, 'modulo:usuarios'), (1, 'modulo:roles'), (1, 'modulo:categorias'), (1, 'modulo:productos'), (1, 'modulo:ajustes'), (1, 'modulo:proveedores'), (1, 'modulo:ingresos'), (1, 'modulo:clientes'), (1, 'modulo:caja'), (1, 'modulo:ventas'), (1, 'modulo:comprobantes'), (1, 'modulo:devoluciones'), (1, 'reporte:kardex'), (1, 'reporte:movimientos'),
(2, 'modulo:dashboard'), (2, 'modulo:clientes'), (2, 'modulo:caja'), (2, 'modulo:ventas'), (2, 'modulo:comprobantes'), (2, 'modulo:devoluciones'),
(3, 'modulo:dashboard'), (3, 'modulo:categorias'), (3, 'modulo:productos'), (3, 'modulo:ajustes'), (3, 'modulo:proveedores'), (3, 'modulo:ingresos'), (3, 'reporte:kardex'), (3, 'reporte:movimientos');
INSERT IGNORE INTO `comprobante_series` (`tipo_comprobante`, `serie`, `correlativo_actual`, `estado`) VALUES ('BOLETA', 'B001', 0, 1), ('FACTURA', 'F001', 0, 1), ('TICKET', 'T001', 0, 1);
