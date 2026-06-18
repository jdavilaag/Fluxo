from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from app.conexion import get_db
from app.models.usuario_model import Usuario
from app.crud.usuario_crud import get_usuario_by_email, crear_usuario, verificar_password, get_usuarios
from app.schema.usuario_schem import UsuarioRegistro, UsuarioLogin, UsuarioResponse, UsuarioUpdate

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.post("/registro", response_model=UsuarioResponse)
def registro(data: UsuarioRegistro, db: Session = Depends(get_db)):
    if get_usuario_by_email(db, data.email):
        raise HTTPException(status_code=400, detail="Email ya registrado")
    # Validar nombre duplicado
    nombre_existe = db.query(Usuario).filter(
        Usuario.nombre_completo == data.nombre_completo
    ).first()
    if nombre_existe:
        raise HTTPException(status_code=400, detail="Ya existe un usuario con ese nombre")
    
    return crear_usuario(db, data.nombre_completo, data.email, data.password, data.rol_id, data.estado)

@router.post("/login")
def login(request: Request, data: UsuarioLogin, db: Session = Depends(get_db)):
    usuario = get_usuario_by_email(db, data.email)
    if not usuario or not verificar_password(data.password, usuario.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    if usuario.estado == 0:
        raise HTTPException(status_code=403, detail="Usuario inactivo")
    request.session["usuario"] = {
        "id": usuario.id,
        "nombre": usuario.nombre_completo,
        "email": usuario.email,
        "rol_id": usuario.rol_id
    }
    print("Sesión guardada:", request.session.get("usuario"))
    return {"mensaje": "Login exitoso", "nombre": usuario.nombre_completo}

@router.get("/usuarios", response_model=List[UsuarioResponse])
def listar_usuarios(db: Session = Depends(get_db)):
    return get_usuarios(db)

@router.put("/usuarios/{usuario_id}", response_model=UsuarioResponse)
def actualizar_usuario(usuario_id: int, data: UsuarioUpdate, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    usuario.nombre_completo = data.nombre_completo
    usuario.email = data.email
    usuario.rol_id = data.rol_id
    usuario.estado = data.estado
    if data.password:
        usuario.password_hash = pwd_context.hash(data.password)
    db.commit()
    db.refresh(usuario)
    return usuario

@router.delete("/usuarios/{usuario_id}")
def eliminar_usuario(usuario_id: int, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    db.delete(usuario)
    db.commit()
    return {"mensaje": "Usuario eliminado"}


@router.get("/sesion")
def obtener_sesion(request: Request):
    usuario = request.session.get("usuario")
    if not usuario:
        raise HTTPException(status_code=401, detail="No hay sesión activa")
    return usuario