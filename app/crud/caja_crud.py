from sqlalchemy.orm import Session
from app.models.caja_model import Caja, CajaMovimiento
from datetime import datetime

def get_caja_abierta(db: Session, usuario_id: int):
    return db.query(Caja).filter(
        Caja.usuario_id == usuario_id,
        Caja.estado == "ABIERTA"
    ).first()

def get_caja_activa(db: Session):
    return db.query(Caja).filter(Caja.estado == "ABIERTA").first()

def abrir_caja(db: Session, usuario_id: int, monto_apertura: float):
    caja = Caja(
        usuario_id=usuario_id,
        monto_apertura=monto_apertura,
        estado="ABIERTA"
    )
    db.add(caja)
    db.commit()
    db.refresh(caja)
    return caja

def cerrar_caja(db: Session, caja_id: int, monto_cierre: float):
    caja = db.query(Caja).filter(Caja.id == caja_id).first()
    if caja:
        caja.monto_cierre = monto_cierre
        caja.fecha_cierre = datetime.now()
        caja.estado = "CERRADA"
        db.commit()
        db.refresh(caja)
    return caja

def get_movimientos(db: Session, caja_id: int):
    return db.query(CajaMovimiento).filter(CajaMovimiento.caja_id == caja_id).all()

def get_historial_cajas(db: Session):
    return db.query(Caja).order_by(Caja.fecha_apertura.desc()).all()