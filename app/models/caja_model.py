from sqlalchemy import Column, Integer, Float, DateTime, String, ForeignKey
from sqlalchemy.sql import func
from app.conexion import Base

class Caja(Base):
    __tablename__ = "caja"

    id = Column("caja_id", Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.usuario_id"), index=True)
    fecha_apertura = Column(DateTime, server_default=func.now(), index=True)
    fecha_cierre = Column(DateTime, nullable=True)
    monto_apertura = Column(Float, default=0)
    monto_cierre = Column(Float, nullable=True)
    estado = Column(String(20), default="abierta")

class CajaMovimiento(Base):
    __tablename__ = "caja_movimientos"

    id = Column("caja_movimiento_id", Integer, primary_key=True, index=True)
    caja_id = Column(Integer, ForeignKey("caja.caja_id"), index=True)
    tipo = Column(String(20))
    monto = Column(Float)
    descripcion = Column(String(255))
    referencia_id = Column(Integer, nullable=True)
    fecha = Column(DateTime, server_default=func.now(), index=True)