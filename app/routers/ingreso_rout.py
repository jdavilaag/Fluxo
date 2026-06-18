from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.conexion import get_db
from app.crud.ingreso_crud import crear_ingreso, get_ingresos, get_ingreso_detalles
from app.schema.ingreso_schem import IngresoRegistro, IngresoResponse, IngresoDetalleResponse

router = APIRouter(prefix="/ingresos", tags=["ingresos"])

@router.post("/", response_model=IngresoResponse)
def registrar_ingreso(request: Request, data: IngresoRegistro, db: Session = Depends(get_db)):
    usuario = request.session.get("usuario")
    if not usuario:
        raise HTTPException(status_code=401, detail="No autorizado")
    
    detalles = [d.model_dump() for d in data.detalles]
    return crear_ingreso(
        db, data.proveedor_id, data.tipo_comprobante,
        data.serie, data.numero, data.fecha_compra,
        usuario["id"], detalles
    )

@router.get("/", response_model=List[IngresoResponse])
def listar_ingresos(db: Session = Depends(get_db)):
    return get_ingresos(db)

@router.get("/{ingreso_id}/detalles", response_model=List[IngresoDetalleResponse])
def detalle_ingreso(ingreso_id: int, db: Session = Depends(get_db)):
    return get_ingreso_detalles(db, ingreso_id)