from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey
from sqlalchemy.sql import func
from app.conexion import Base

class Producto(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    categoria_id = Column(Integer, ForeignKey("categorias.id"))
    codigo_barras = Column(String(100), unique=True)
    nombre_producto = Column(String(255))
    precio_compra = Column(Float, default=0)
    precio_venta = Column(Float, default=0)
    maneja_vencimiento = Column(Integer, default=0)
    stock_actual = Column(Integer, default=0)
    stock_minimo = Column(Integer, default=0)
    unidad_medida = Column(String(50))
    estado = Column(Integer, default=1)
    creado_en = Column(DateTime, server_default=func.now())