from sqlalchemy.orm import Session
from app.models.rol_model import Rol, RolPermiso

def get_roles(db: Session):
    return db.query(Rol).all()

def get_rol_by_id(db: Session, rol_id: int):
    return db.query(Rol).filter(Rol.id == rol_id).first()

def get_rol_by_name(db: Session, nombre_rol: str):
    return db.query(Rol).filter(Rol.nombre_rol == nombre_rol).first()

def crear_rol(db: Session, nombre_rol: str, es_jefatura: int, estado: int):
    rol = Rol(
        nombre_rol=nombre_rol,
        es_jefatura=es_jefatura,
        estado=estado
    )
    db.add(rol)
    db.commit()
    db.refresh(rol)
    return rol

def actualizar_rol(db: Session, rol_id: int, nombre_rol: str, es_jefatura: int, estado: int):
    rol = get_rol_by_id(db, rol_id)
    if not rol:
        return None
    rol.nombre_rol = nombre_rol
    rol.es_jefatura = es_jefatura
    rol.estado = estado
    db.commit()
    db.refresh(rol)
    return rol

def eliminar_rol(db: Session, rol_id: int):
    rol = get_rol_by_id(db, rol_id)
    if not rol:
        return False
    db.delete(rol)
    db.commit()
    return True

def get_permisos_by_rol(db: Session, rol_id: int):
    results = db.query(RolPermiso).filter(RolPermiso.rol_id == rol_id).all()
    return [p.permiso_key for p in results]

def actualizar_permisos_rol(db: Session, rol_id: int, permiso_keys: list):
    # Delete existing permissions for the role
    db.query(RolPermiso).filter(RolPermiso.rol_id == rol_id).delete()
    
    # Insert new permissions
    for key in permiso_keys:
        perm = RolPermiso(rol_id=rol_id, permiso_key=key)
        db.add(perm)
    
    db.commit()
    return permiso_keys
