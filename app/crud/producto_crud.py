from sqlalchemy.orm import Session
from app.models.producto_model import Producto

def get_producto_by_nombre(db: Session, nombre: str):
    return db.query(Producto).filter(Producto.nombre_producto == nombre).first()

def get_producto_by_codigo(db: Session, codigo: str):
    return db.query(Producto).filter(Producto.codigo_barras == codigo).first()

def get_productos(db: Session):
    return db.query(Producto).all()

def crear_producto(db: Session, data: dict):
    producto = Producto(**data)
    db.add(producto)
    db.commit()
    db.refresh(producto)
    return producto