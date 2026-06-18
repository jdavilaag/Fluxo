from sqlalchemy.orm import Session
from app.models.categoria_model import Categoria

def get_categoria_by_nombre(db: Session, nombre: str):
    return db.query(Categoria).filter(Categoria.nombre_categoria == nombre).first()

def get_categorias(db: Session):
    return db.query(Categoria).all()

def crear_categoria(db: Session, nombre_categoria: str, descripcion: str, estado: int):
    categoria = Categoria(
        nombre_categoria=nombre_categoria,
        descripcion=descripcion,
        estado=estado
    )
    db.add(categoria)
    db.commit()
    db.refresh(categoria)
    return categoria