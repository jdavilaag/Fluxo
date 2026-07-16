from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.conexion import get_db
from app.models.kardex_model import KardexMovimiento
from app.models.producto_model import Producto
from app.models.usuario_model import Usuario
from app.dependencies import require_permission

router = APIRouter(
    prefix="/kardex",
    tags=["kardex"],
    dependencies=[Depends(require_permission("reporte:kardex"))]
)

@router.get("/")
def listar_kardex(db: Session = Depends(get_db)):
    movimientos = db.query(
        KardexMovimiento,
        Producto.nombre_producto,
        Usuario.nombre_completo
    ).outerjoin(
        Producto, Producto.id == KardexMovimiento.producto_id
    ).outerjoin(
        Usuario, Usuario.id == KardexMovimiento.usuario_id
    ).order_by(
        KardexMovimiento.fecha_registro.desc()
    ).all()

    resultado = []
    for m, prod_nombre, usr_nombre in movimientos:
        resultado.append({
            "id": m.id,
            "producto": prod_nombre if prod_nombre else "-",
            "tipo_movimiento": m.tipo_movimiento,
            "cantidad": m.cantidad,
            "stock_anterior": m.stock_anterior,
            "stock_posterior": m.stock_posterior,
            "observacion": m.observacion,
            "usuario": usr_nombre if usr_nombre else "-",
            "fecha_registro": m.fecha_registro
        })
    return resultado

@router.get("/producto/{producto_id}")
def kardex_por_producto(producto_id: int, db: Session = Depends(get_db)):
    movimientos = db.query(
        KardexMovimiento,
        Usuario.nombre_completo
    ).outerjoin(
        Usuario, Usuario.id == KardexMovimiento.usuario_id
    ).filter(
        KardexMovimiento.producto_id == producto_id
    ).order_by(
        KardexMovimiento.fecha_registro.desc()
    ).all()

    resultado = []
    for m, usr_nombre in movimientos:
        resultado.append({
            "id": m.id,
            "tipo_movimiento": m.tipo_movimiento,
            "cantidad": m.cantidad,
            "stock_anterior": m.stock_anterior,
            "stock_posterior": m.stock_posterior,
            "observacion": m.observacion,
            "usuario": usr_nombre if usr_nombre else "-",
            "fecha_registro": m.fecha_registro
        })
    return resultado