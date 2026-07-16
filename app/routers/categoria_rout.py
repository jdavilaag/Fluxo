from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.conexion import get_db
from app.models.categoria_model import Categoria
from app.crud.categoria_crud import get_categoria_by_nombre, get_categorias, crear_categoria
from app.schema.categoria_schem import CategoriaRegistro, CategoriaResponse, CategoriaUpdate
from app.dependencies import require_permission

router = APIRouter(
    prefix="/categorias",
    tags=["categorias"],
    dependencies=[Depends(require_permission("modulo:categorias"))]
)

@router.post("/", response_model=CategoriaResponse)
def registrar_categoria(data: CategoriaRegistro, db: Session = Depends(get_db)):
    if get_categoria_by_nombre(db, data.nombre_categoria):
        raise HTTPException(status_code=400, detail="Categoría ya registrada")
    return crear_categoria(db, data.nombre_categoria, data.descripcion, data.estado)

@router.get("/", response_model=List[CategoriaResponse])
def listar_categorias(db: Session = Depends(get_db)):
    return get_categorias(db)

@router.put("/{categoria_id}", response_model=CategoriaResponse)
def actualizar_categoria(categoria_id: int, data: CategoriaUpdate, db: Session = Depends(get_db)):
    categoria = db.query(Categoria).filter(Categoria.id == categoria_id).first()
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    categoria.nombre_categoria = data.nombre_categoria
    categoria.descripcion = data.descripcion
    categoria.estado = data.estado
    db.commit()
    db.refresh(categoria)
    return categoria

@router.delete("/{categoria_id}")
def eliminar_categoria(categoria_id: int, db: Session = Depends(get_db)):
    categoria = db.query(Categoria).filter(Categoria.id == categoria_id).first()
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    categoria.estado = 0
    db.commit()
    return {"mensaje": "Categoría desactivada"}