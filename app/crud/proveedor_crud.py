from sqlalchemy.orm import Session
from app.models.proveedor_model import Proveedor

def get_proveedor_by_ruc(db: Session, ruc: str):
    return db.query(Proveedor).filter(Proveedor.ruc == ruc).first()

def get_proveedores(db: Session):
    return db.query(Proveedor).all()

def crear_proveedor(db: Session, ruc: str, razon_social: str, telefono: str, email: str, direccion: str, estado: int):
    proveedor = Proveedor(
        ruc=ruc,
        razon_social=razon_social,
        telefono=telefono,
        email=email,
        direccion=direccion,
        estado=estado
    )
    db.add(proveedor)
    db.commit()
    db.refresh(proveedor)
    return proveedor