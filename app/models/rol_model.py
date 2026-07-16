from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.conexion import Base

class Rol(Base):
    __tablename__ = "roles"

    id = Column("rol_id", Integer, primary_key=True, index=True)
    nombre_rol = Column(String(50), unique=True, nullable=False)
    es_jefatura = Column(Integer, default=0)
    estado = Column(Integer, default=1)
    creado_en = Column(DateTime, server_default=func.now())

class RolPermiso(Base):
    __tablename__ = "roles_permisos"

    rol_id = Column(Integer, ForeignKey("roles.rol_id", ondelete="CASCADE"), primary_key=True)
    permiso_key = Column(String(100), primary_key=True)
