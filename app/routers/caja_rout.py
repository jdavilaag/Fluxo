from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.conexion import get_db
from app.models.caja_model import Caja
from app.crud.caja_crud import get_caja_abierta, abrir_caja, cerrar_caja, get_movimientos, get_historial_cajas, get_caja_activa
from app.schema.caja_schem import AbrirCaja, CerrarCaja, CajaResponse, CajaMovimientoResponse
from app.models.usuario_model import Usuario

from app.dependencies import require_auth, require_permission

router = APIRouter(
    prefix="/caja",
    tags=["caja"],
    dependencies=[Depends(require_permission("modulo:caja"))]
)

@router.post("/abrir", response_model=CajaResponse)
def abrir(data: AbrirCaja, db: Session = Depends(get_db), usuario: dict = Depends(require_auth)):
    usuario_id = usuario["id"]
    caja_abierta = get_caja_abierta(db, usuario_id)
    if caja_abierta:
        raise HTTPException(status_code=400, detail="Ya existe una caja abierta para este usuario")
    return abrir_caja(db, usuario_id, data.monto_apertura)

@router.post("/cerrar/{caja_id}", response_model=CajaResponse)
def cerrar(caja_id: int, data: CerrarCaja, db: Session = Depends(get_db), usuario: dict = Depends(require_auth)):
    caja = db.query(Caja).filter(Caja.id == caja_id).first()
    if not caja:
        raise HTTPException(status_code=404, detail="Caja no encontrada")
    if caja.usuario_id != usuario["id"] and usuario["rol_id"] != 1:
        raise HTTPException(status_code=403, detail="No autorizado para cerrar esta caja")
    if caja.estado == "CERRADA":
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
@router.get("/historial-detalle")
def historial_detalle(db: Session = Depends(get_db)):
    cajas = db.query(
        Caja,
        Usuario.nombre_completo
    ).outerjoin(
        Usuario, Usuario.id == Caja.usuario_id
    ).order_by(
        Caja.fecha_apertura.desc()
    ).all()

    resultado = []
    for c, usr_nombre in cajas:
        resultado.append({
            "id": c.id,
            "usuario": usr_nombre if usr_nombre else "-",
            "fecha_apertura": c.fecha_apertura,
            "fecha_cierre": c.fecha_cierre,
            "monto_apertura": c.monto_apertura,
            "monto_cierre": c.monto_cierre,
            "estado": c.estado
        })
    return resultado