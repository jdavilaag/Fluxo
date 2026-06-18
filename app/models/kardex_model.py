from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.conexion import Base

class KardexMovimiento(Base):
    __tablename__ = "kardex_movimientos"

    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(Integer, ForeignKey("productos.id"))
    lote_id = Column(Integer, ForeignKey("lotes.id"), nullable=True)
    tipo_movimiento = Column(String(20))
    cantidad = Column(Integer)
    stock_anterior = Column(Integer)
    stock_posterior = Column(Integer)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    observacion = Column(String(255))
    fecha_registro = Column(DateTime, server_default=func.now())