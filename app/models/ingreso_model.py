from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.conexion import Base

class IngresoHdr(Base):
    __tablename__ = "ingresos_hdr"

    id = Column(Integer, primary_key=True, index=True)
    proveedor_id = Column(Integer, ForeignKey("proveedores.id"), index=True)
    tipo_comprobante = Column(String(50))
    serie = Column(String(20))
    numero = Column(String(20))
    nro_comprobante = Column(String(50))
    fecha_compra = Column(DateTime, index=True)
    fecha_registro = Column(DateTime, server_default=func.now(), index=True)
    total = Column(Float, default=0)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), index=True)
    estado = Column(String(20), default="activo")

class IngresoDtl(Base):
    __tablename__ = "ingresos_dtl"

    id = Column(Integer, primary_key=True, index=True)
    ingreso_id = Column(Integer, ForeignKey("ingresos_hdr.id"), index=True)
    producto_id = Column(Integer, ForeignKey("productos.id"), index=True)
    lote_id = Column(Integer, ForeignKey("lotes.id"), nullable=True, index=True)
    cantidad = Column(Integer)
    precio_costo = Column(Float)
    subtotal = Column(Float)