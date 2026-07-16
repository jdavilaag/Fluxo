from sqlalchemy.orm import Session
from app.models.usuario_model import Usuario
from app.security import obtener_password_hash, verificar_password as sec_verificar_password

def get_usuario_by_email(db: Session, email: str):
    return db.query(Usuario).filter(Usuario.email == email).first()

def crear_usuario(db: Session, nombre_completo: str, email: str, password: str, rol_id: int, estado: int = 1):
    hashed = obtener_password_hash(password)
    usuario = Usuario(
        nombre_completo=nombre_completo,
        email=email,
        password_hash=hashed,
        rol_id=rol_id,
        estado=estado
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario

def verificar_password(password: str, hashed: str):
    return sec_verificar_password(password, hashed)

def get_usuarios(db: Session):
    return db.query(Usuario).all()