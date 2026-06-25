from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.conexion import get_db
from app.models.producto_model import Producto
from app.crud.producto_crud import get_producto_by_nombre, get_producto_by_codigo, get_productos, crear_producto
from app.schema.producto_schem import ProductoRegistro, ProductoResponse, ProductoUpdate
from app.dependencies import require_auth

router = APIRouter(prefix="/productos", tags=["productos"], dependencies=[Depends(require_auth)])

@router.post("/", response_model=ProductoResponse)
def registrar_producto(data: ProductoRegistro, db: Session = Depends(get_db)):
    if get_producto_by_nombre(db, data.nombre_producto):
        raise HTTPException(status_code=400, detail="Producto ya registrado")
    if data.codigo_barras and get_producto_by_codigo(db, data.codigo_barras):
        raise HTTPException(status_code=400, detail="Código de barras ya registrado")
    return crear_producto(db, data.model_dump())

@router.get("/", response_model=List[ProductoResponse])
def listar_productos(db: Session = Depends(get_db)):
    return get_productos(db)

@router.put("/{producto_id}", response_model=ProductoResponse)
def actualizar_producto(producto_id: int, data: ProductoUpdate, db: Session = Depends(get_db)):
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    for key, value in data.model_dump().items():
        setattr(producto, key, value)
    db.commit()
    db.refresh(producto)
    return producto

@router.delete("/{producto_id}")
def eliminar_producto(producto_id: int, db: Session = Depends(get_db)):
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    producto.estado = 0
    db.commit()
    return {"mensaje": "Producto desactivado"}