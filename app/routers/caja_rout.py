from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.conexion import get_db
from app.models.caja_model import Caja
from app.crud.caja_crud import get_caja_abierta, abrir_caja, cerrar_caja, get_movimientos, get_historial_cajas, get_caja_activa
from app.schema.caja_schem import AbrirCaja, CerrarCaja, CajaResponse, CajaMovimientoResponse
from app.models.usuario_model import Usuario

router = APIRouter(prefix="/caja", tags=["caja"])

@router.post("/abrir", response_model=CajaResponse)
def abrir(data: AbrirCaja, db: Session = Depends(get_db)):
    caja_abierta = get_caja_abierta(db, data.usuario_id)
    if caja_abierta:
        raise HTTPException(status_code=400, detail="Ya existe una caja abierta para este usuario")
    return abrir_caja(db, data.usuario_id, data.monto_apertura)

@router.post("/cerrar/{caja_id}", response_model=CajaResponse)
def cerrar(caja_id: int, data: CerrarCaja, db: Session = Depends(get_db)):
    caja = db.query(Caja).filter(Caja.id == caja_id).first()
    if not caja:
        raise HTTPException(status_code=404, detail="Caja no encontrada")
    if caja.estado == "cerrada":
        raise HTTPException(status_code=400, detail="La caja ya está cerrada")
    return cerrar_caja(db, caja_id, data.monto_cierre)

@router.get("/activa", response_model=CajaResponse)
def caja_activa(db: Session = Depends(get_db)):
    caja = get_caja_activa(db)
    if not caja:
        raise HTTPException(status_code=404, detail="No hay caja abierta")
    return caja

@router.get("/historial", response_model=List[CajaResponse])
def historial(db: Session = Depends(get_db)):
    return get_historial_cajas(db)

@router.get("/movimientos/{caja_id}", response_model=List[CajaMovimientoResponse])
def movimientos(caja_id: int, db: Session = Depends(get_db)):
    return get_movimientos(db, caja_id)
from app.models.usuario_model import Usuario

@router.get("/historial-detalle")
def historial_detalle(db: Session = Depends(get_db)):
    cajas = db.query(Caja).order_by(Caja.fecha_apertura.desc()).all()
    resultado = []
    for c in cajas:
        usuario = db.query(Usuario).filter(Usuario.id == c.usuario_id).first()
        resultado.append({
            "id": c.id,
            "usuario": usuario.nombre_completo if usuario else "-",
            "fecha_apertura": c.fecha_apertura,
            "fecha_cierre": c.fecha_cierre,
            "monto_apertura": c.monto_apertura,
            "monto_cierre": c.monto_cierre,
            "estado": c.estado
        })
    return resultado