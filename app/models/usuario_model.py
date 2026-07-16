from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.conexion import Base

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column("usuario_id", Integer, primary_key=True, index=True)
    rol_id = Column(Integer)
    nombre_completo = Column(String(255))
    email = Column(String(255), unique=True)
    password_hash = Column(String(255))
    estado = Column(Integer, default=1)
    creado_en = Column(DateTime, server_default=func.now())