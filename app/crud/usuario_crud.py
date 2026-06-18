import bcrypt
from sqlalchemy.orm import Session
from app.models.usuario_model import Usuario

def get_usuario_by_email(db: Session, email: str):
    return db.query(Usuario).filter(Usuario.email == email).first()

def crear_usuario(db: Session, nombre_completo: str, email: str, password: str, rol_id: int, estado: int = 1):
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
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
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))

def get_usuarios(db: Session):
    return db.query(Usuario).all()