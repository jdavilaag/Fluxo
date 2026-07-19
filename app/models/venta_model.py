from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.conexion import Base

class VentaHdr(Base):
    __tablename__ = "ventas_hdr"

    id = Column("venta_hdr_id", Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.cliente_id"), index=True)
    fecha_venta = Column(DateTime, server_default=func.now(), index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.usuario_id"), index=True)
    caja_id = Column(Integer, ForeignKey("caja.caja_id"), nullable=True)
    comprobante_serie_id = Column(Integer, ForeignKey("comprobante_series.comprobante_serie_id"), nullable=True)
    subtotal = Column(Float, default=0)
    igv = Column(Float, default=0)
    total = Column(Float, default=0)
    estado = Column(String(20), default="PAGADO")
    tipo_comprobante = Column(String(50), nullable=True, index=True)
    serie = Column(String(10), nullable=True, index=True)
    numero = Column(String(20), nullable=True)
    nro_comprobante = Column(String(50), nullable=True, index=True)

class VentaDtl(Base):
    __tablename__ = "ventas_dtl"

    id = Column("venta_dtl_id", Integer, primary_key=True, index=True)
    venta_id = Column("venta_hdr_id", Integer, ForeignKey("ventas_hdr.venta_hdr_id"), index=True)
    producto_id = Column(Integer, ForeignKey("productos.producto_id"), index=True)
    lote_id = Column(Integer, ForeignKey("lotes.lote_id"), nullable=True, index=True)
    cantidad = Column(Integer)
    precio_venta = Column(Float)
    subtotal = Column(Float)

class VentaPago(Base):
    __tablename__ = "ventas_pagos"

    id = Column("venta_pago_id", Integer, primary_key=True, index=True)
    venta_id = Column("venta_hdr_id", Integer, ForeignKey("ventas_hdr.venta_hdr_id"), index=True)
    metodo_pago = Column(String(50))
    id_transaccion_api = Column(String(100), nullable=True)
    proveedor_pago = Column(String(50), nullable=True)
    monto = Column(Float)
    estado_pago = Column(String(20), default="completado")
    fecha_pago = Column(DateTime, server_default=func.now())