from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.conexion import Base

class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    documento = Column(String(20), unique=True)
    nombres = Column(String(255))
    telefono = Column(String(20))
    email = Column(String(255))
    direccion = Column(String(255))
    estado = Column(Integer, default=1)
    creado_en = Column(DateTime, server_default=func.now())