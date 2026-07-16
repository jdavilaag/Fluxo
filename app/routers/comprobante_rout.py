from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.conexion import get_db
from app.dependencies import require_auth, require_permission
from app.crud.comprobante_crud import (
    get_comprobante_series,
    get_comprobante_serie_by_id,
    crear_comprobante_serie,
    actualizar_comprobante_serie,
    logical_delete_comprobante_serie,
    obtener_proximo_correlativo
)
from app.schema.comprobante_schem import ComprobanteSerieCreate, ComprobanteSerieResponse

router = APIRouter(
    prefix="/comprobante-series",
    tags=["comprobantes"],
    dependencies=[Depends(require_permission("modulo:comprobantes"))]
)

@router.get("/", response_model=List[ComprobanteSerieResponse])
def listar_series(activos: bool = False, db: Session = Depends(get_db)):
    return get_comprobante_series(db, include_inactive=not activos)

@router.get("/next-number")
def get_next_number(tipo: str, serie: str, db: Session = Depends(get_db)):
    next_num = obtener_proximo_correlativo(db, tipo, serie)
    return {"next_number": next_num}

@router.post("/", response_model=ComprobanteSerieResponse)
def registrar_serie(data: ComprobanteSerieCreate, db: Session = Depends(get_db)):
    return crear_comprobante_serie(db, data)

@router.put("/{series_id}", response_model=ComprobanteSerieResponse)
def editar_serie(series_id: int, data: ComprobanteSerieCreate, db: Session = Depends(get_db)):
    return actualizar_comprobante_serie(db, series_id, data)

@router.delete("/{series_id}", response_model=ComprobanteSerieResponse)
def eliminar_serie(series_id: int, db: Session = Depends(get_db)):
    return logical_delete_comprobante_serie(db, series_id)
