from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.conexion import get_db
from app.models.usuario_model import Usuario
from app.crud.rol_crud import (
    get_roles,
    get_rol_by_id,
    get_rol_by_name,
    crear_rol,
    actualizar_rol,
    eliminar_rol,
    get_permisos_by_rol,
    actualizar_permisos_rol
)
from app.schema.rol_schem import RolRegistro, RolResponse, RolUpdate, RolPermisosUpdate
from app.dependencies import require_permission

router = APIRouter(
    prefix="/auth",
    tags=["roles"],
    dependencies=[Depends(require_permission("modulo:roles"))]
)

@router.get("/roles", response_model=List[RolResponse])
def listar_roles(db: Session = Depends(get_db)):
    return get_roles(db)

@router.post("/roles", response_model=RolResponse)
def registrar_rol(data: RolRegistro, db: Session = Depends(get_db)):
    if get_rol_by_name(db, data.nombre_rol):
        raise HTTPException(status_code=400, detail="El rol ya existe")
    return crear_rol(db, data.nombre_rol, data.es_jefatura, data.estado)

@router.put("/roles/{rol_id}", response_model=RolResponse)
def actualizar_datos_rol(rol_id: int, data: RolUpdate, db: Session = Depends(get_db)):
    rol = get_rol_by_id(db, rol_id)
    if not rol:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    
    # Check if duplicate name on another role
    existing = get_rol_by_name(db, data.nombre_rol)
    if existing and existing.id != rol_id:
        raise HTTPException(status_code=400, detail="El nombre de rol ya está en uso")
        
    return actualizar_rol(db, rol_id, data.nombre_rol, data.es_jefatura, data.estado)

@router.delete("/roles/{rol_id}")
def eliminar_registro_rol(rol_id: int, db: Session = Depends(get_db)):
    rol = get_rol_by_id(db, rol_id)
    if not rol:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
        
    # Check if any user is using this role
    usuario_con_rol = db.query(Usuario).filter(Usuario.rol_id == rol_id).first()
    if usuario_con_rol:
        raise HTTPException(
            status_code=400, 
            detail="No se puede eliminar el rol porque está asignado a uno o más usuarios"
        )
        
    if not eliminar_rol(db, rol_id):
        raise HTTPException(status_code=500, detail="Error al eliminar el rol")
        
    return {"mensaje": "Rol eliminado correctamente"}

@router.get("/roles/{rol_id}/permisos", response_model=List[str])
def obtener_permisos_rol(rol_id: int, db: Session = Depends(get_db)):
    rol = get_rol_by_id(db, rol_id)
    if not rol:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    return get_permisos_by_rol(db, rol_id)

@router.put("/roles/{rol_id}/permisos")
def actualizar_permisos_del_rol(rol_id: int, data: RolPermisosUpdate, db: Session = Depends(get_db)):
    rol = get_rol_by_id(db, rol_id)
    if not rol:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    actualizar_permisos_rol(db, rol_id, data.permiso_keys)
    return {"mensaje": "Permisos actualizados correctamente"}
