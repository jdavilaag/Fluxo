from sqlalchemy import Column, Integer, String, DateTime, Numeric, ForeignKey
from sqlalchemy.sql import func
from app.conexion import Base

class DevolucionHdr(Base):
    __tablename__ = "devoluciones_hdr"

    id = Column("devolucion_hdr_id", Integer, primary_key=True, index=True)
    tipo_devolucion = Column(String(10), nullable=False) # 'VENTA' o 'COMPRA'
    venta_hdr_id = Column(Integer, ForeignKey("ventas_hdr.venta_hdr_id"), nullable=True)
    ingreso_hdr_id = Column(Integer, ForeignKey("ingresos_hdr.ingreso_hdr_id"), nullable=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.usuario_id"), nullable=False)
    motivo = Column(String(255), nullable=False)
    fecha_registro = Column(DateTime, server_default=func.now())
    estado = Column(String(20), default="REGISTRADO") # 'REGISTRADO' o 'ANULADO'

class DevolucionDtl(Base):
    __tablename__ = "devoluciones_dtl"

    id = Column("devolucion_dtl_id", Integer, primary_key=True, index=True)
    devolucion_hdr_id = Column(Integer, ForeignKey("devoluciones_hdr.devolucion_hdr_id", ondelete="CASCADE"), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.producto_id"), nullable=False)
    lote_id = Column(Integer, ForeignKey("lotes.lote_id"), nullable=True)
    cantidad = Column(Numeric(10, 2), nullable=False)
    precio_unitario = Column(Numeric(10, 2), nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=True)
