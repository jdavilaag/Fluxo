from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, BigInteger
from sqlalchemy.sql import func
from app.conexion import Base

class KardexMovimiento(Base):
    __tablename__ = "kardex_movimientos"

    id = Column("kardex_movimiento_id", BigInteger, primary_key=True, index=True)
    producto_id = Column(Integer, ForeignKey("productos.producto_id"), index=True)
    lote_id = Column(Integer, ForeignKey("lotes.lote_id"), nullable=True)
    tipo_movimiento = Column(String(20))
    referencia_tipo = Column(String(50), nullable=True)
    referencia_id = Column(Integer, nullable=True)
    cantidad = Column(Integer)
    stock_anterior = Column(Integer)
    stock_posterior = Column(Integer)
    usuario_id = Column(Integer, ForeignKey("usuarios.usuario_id"), index=True)
    observacion = Column(String(255))
    fecha_registro = Column(DateTime, server_default=func.now(), index=True)