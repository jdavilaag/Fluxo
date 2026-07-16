from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.conexion import Base

class ComprobanteSerie(Base):
    __tablename__ = "comprobante_series"

    id = Column("comprobante_serie_id", Integer, primary_key=True, index=True)
    tipo_comprobante = Column(String(50), nullable=False)
    serie = Column(String(10), nullable=False, unique=True)
    correlativo_actual = Column(Integer, nullable=False, default=0)
    estado = Column(Integer, nullable=False, default=1)  # 1: Activo, 0: Inactivo
    creado_en = Column(DateTime, server_default=func.now())
