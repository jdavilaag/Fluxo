from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.conexion import Base

class Categoria(Base):
    __tablename__ = "categorias"

    id = Column(Integer, primary_key=True, index=True)
    nombre_categoria = Column(String(255), unique=True)
    descripcion = Column(String(255))
    estado = Column(Integer, default=1)
    creado_en = Column(DateTime, server_default=func.now())