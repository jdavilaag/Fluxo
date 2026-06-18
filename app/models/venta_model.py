from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.conexion import Base

class VentaHdr(Base):
    __tablename__ = "ventas_hdr"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"))
    fecha_venta = Column(DateTime, server_default=func.now())
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    subtotal = Column(Float, default=0)
    igv = Column(Float, default=0)
    total = Column(Float, default=0)
    estado = Column(String(20), default="activo")

class VentaDtl(Base):
    __tablename__ = "ventas_dtl"

    id = Column(Integer, primary_key=True, index=True)
    venta_id = Column(Integer, ForeignKey("ventas_hdr.id"))
    producto_id = Column(Integer, ForeignKey("productos.id"))
    lote_id = Column(Integer, ForeignKey("lotes.id"), nullable=True)
    cantidad = Column(Integer)
    precio_venta = Column(Float)
    subtotal = Column(Float)

class VentaPago(Base):
    __tablename__ = "ventas_pagos"

    id = Column(Integer, primary_key=True, index=True)
    venta_id = Column(Integer, ForeignKey("ventas_hdr.id"))
    metodo_pago = Column(String(50))
    id_transaccion_api = Column(String(100), nullable=True)
    proveedor_pago = Column(String(50), nullable=True)
    monto = Column(Float)
    estado_pago = Column(String(20), default="completado")
    fecha_pago = Column(DateTime, server_default=func.now())