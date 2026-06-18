from sqlalchemy.orm import Session
from app.models.cliente_model import Cliente

def get_cliente_by_documento(db: Session, documento: str):
    return db.query(Cliente).filter(Cliente.documento == documento).first()

def get_clientes(db: Session):
    return db.query(Cliente).all()

def crear_cliente(db: Session, documento: str, nombres: str, telefono: str, email: str, direccion: str, estado: int):
    cliente = Cliente(
        documento=documento,
        nombres=nombres,
        telefono=telefono,
        email=email,
        direccion=direccion,
        estado=estado
    )
    db.add(cliente)
    db.commit()
    db.refresh(cliente)
    return cliente