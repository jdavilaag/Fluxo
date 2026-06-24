from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.conexion import get_db
from app.models.kardex_model import KardexMovimiento
from app.models.producto_model import Producto
from app.models.usuario_model import Usuario

router = APIRouter(prefix="/kardex", tags=["kardex"])

@router.get("/")
def listar_kardex(db: Session = Depends(get_db)):
    movimientos = db.query(KardexMovimiento).order_by(
        KardexMovimiento.fecha_registro.desc()
    ).all()

    resultado = []
    for m in movimientos:
        producto = db.query(Producto).filter(Producto.id == m.producto_id).first()
        usuario = db.query(Usuario).filter(Usuario.id == m.usuario_id).first()
        resultado.append({
            "id": m.id,
            "producto": producto.nombre_producto if producto else "-",
            "tipo_movimiento": m.tipo_movimiento,
            "cantidad": m.cantidad,
            "stock_anterior": m.stock_anterior,
            "stock_posterior": m.stock_posterior,
            "observacion": m.observacion,
            "usuario": usuario.nombre_completo if usuario else "-",
            "fecha_registro": m.fecha_registro
        })
    return resultado

@router.get("/producto/{producto_id}")
def kardex_por_producto(producto_id: int, db: Session = Depends(get_db)):
    movimientos = db.query(KardexMovimiento).filter(
        KardexMovimiento.producto_id == producto_id
    ).order_by(KardexMovimiento.fecha_registro.desc()).all()

    resultado = []
    for m in movimientos:
        usuario = db.query(Usuario).filter(Usuario.id == m.usuario_id).first()
        resultado.append({
            "id": m.id,
            "tipo_movimiento": m.tipo_movimiento,
            "cantidad": m.cantidad,
            "stock_anterior": m.stock_anterior,
            "stock_posterior": m.stock_posterior,
            "observacion": m.observacion,
            "usuario": usuario.nombre_completo if usuario else "-",
            "fecha_registro": m.fecha_registro
        })
    return resultado