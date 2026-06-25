from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.conexion import Base

class Lote(Base):
    __tablename__ = "lotes"

    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(Integer, ForeignKey("productos.id"), index=True)
    fecha_vencimiento = Column(DateTime, nullable=True)
    nro_lote = Column(String(50))
    stock_lote = Column(Integer, default=0)
    fecha_ingreso = Column(DateTime, server_default=func.now(), index=True)
    estado = Column(Integer, default=1)