from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.conexion import get_db
from app.crud.ajuste_crud import get_ajustes, crear_ajuste, procesar_ajuste
from app.schema.ajuste_schem import AjusteRegistro, AjusteProcesar, AjusteResponse
from app.dependencies import require_permission

router = APIRouter(
    prefix="/ajustes",
    tags=["ajustes"],
    dependencies=[Depends(require_permission("modulo:ajustes"))]
)

@router.get("/", response_model=List[AjusteResponse])
def listar_ajustes(db: Session = Depends(get_db)):
    return get_ajustes(db)

@router.post("/", response_model=AjusteResponse)
def registrar_ajuste(request: Request, data: AjusteRegistro, db: Session = Depends(get_db)):
    usuario = request.session.get("usuario")
    if not usuario:
        raise HTTPException(status_code=401, detail="No autorizado")
    return crear_ajuste(db, data, usuario["id"])

@router.post("/{ajuste_id}/procesar", response_model=AjusteResponse)
def procesar_solicitud_ajuste(request: Request, ajuste_id: int, data: AjusteProcesar, db: Session = Depends(get_db)):
    usuario = request.session.get("usuario")
    if not usuario:
        raise HTTPException(status_code=401, detail="No autorizado")
    if usuario["rol_id"] != 1:
        raise HTTPException(status_code=403, detail="Solo administradores pueden procesar ajustes de stock")
    return procesar_ajuste(db, ajuste_id, usuario["id"], data.aprobar)
