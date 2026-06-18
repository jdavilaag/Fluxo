from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.conexion import get_db
from app.crud.venta_crud import crear_venta, get_ventas, get_venta_detalles
from app.schema.venta_schem import VentaRegistro, VentaResponse, VentaDetalleResponse

router = APIRouter(prefix="/ventas", tags=["ventas"])

@router.post("/", response_model=VentaResponse)
def registrar_venta(request: Request, data: VentaRegistro, db: Session = Depends(get_db)):
    usuario = request.session.get("usuario")
    if not usuario:
        raise HTTPException(status_code=401, detail="No autorizado")
    detalles = [d.model_dump() for d in data.detalles]
    return crear_venta(db, data.cliente_id, detalles, data.metodo_pago,
                       data.monto_pago, data.aplicar_igv, usuario["id"])

@router.get("/", response_model=List[VentaResponse])
def listar_ventas(db: Session = Depends(get_db)):
    return get_ventas(db)

@router.get("/{venta_id}/detalles", response_model=List[VentaDetalleResponse])
def detalle_venta(venta_id: int, db: Session = Depends(get_db)):
    return get_venta_detalles(db, venta_id)