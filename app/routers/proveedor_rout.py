from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.conexion import get_db
from app.models.proveedor_model import Proveedor
from app.crud.proveedor_crud import get_proveedor_by_ruc, get_proveedores, crear_proveedor
from app.schema.proveedor_schem import ProveedorRegistro, ProveedorResponse, ProveedorUpdate
from app.dependencies import require_permission

router = APIRouter(
    prefix="/proveedores",
    tags=["proveedores"],
    dependencies=[Depends(require_permission("modulo:proveedores"))]
)

@router.post("/", response_model=ProveedorResponse)
def registrar_proveedor(data: ProveedorRegistro, db: Session = Depends(get_db)):
    if get_proveedor_by_ruc(db, data.ruc):
        raise HTTPException(status_code=400, detail="RUC ya registrado")
    return crear_proveedor(db, data.ruc, data.razon_social, data.telefono, data.email, data.direccion, data.estado)

@router.get("/", response_model=List[ProveedorResponse])
def listar_proveedores(db: Session = Depends(get_db)):
    return get_proveedores(db)

@router.put("/{proveedor_id}", response_model=ProveedorResponse)
def actualizar_proveedor(proveedor_id: int, data: ProveedorUpdate, db: Session = Depends(get_db)):
    proveedor = db.query(Proveedor).filter(Proveedor.id == proveedor_id).first()
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    proveedor.ruc = data.ruc
    proveedor.razon_social = data.razon_social
    proveedor.telefono = data.telefono
    proveedor.email = data.email
    proveedor.direccion = data.direccion
    proveedor.estado = data.estado
    db.commit()
    db.refresh(proveedor)
    return proveedor

@router.delete("/{proveedor_id}")
def eliminar_proveedor(proveedor_id: int, db: Session = Depends(get_db)):
    proveedor = db.query(Proveedor).filter(Proveedor.id == proveedor_id).first()
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    proveedor.estado = 0
    db.commit()
    return {"mensaje": "Proveedor desactivado"}