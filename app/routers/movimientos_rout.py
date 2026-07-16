from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.conexion import get_db
from app.dependencies import require_permission
from app.models.kardex_model import KardexMovimiento
from app.models.producto_model import Producto
from app.models.lote_model import Lote
from app.models.usuario_model import Usuario
from app.models.venta_model import VentaHdr
from app.models.ingreso_model import IngresoHdr
from app.models.ajuste_model import AjusteInventario

router = APIRouter(prefix="/auth/movimientos", tags=["movimientos"], dependencies=[Depends(require_permission("reporte:movimientos"))])

@router.get("")
def listar_movimientos_inventario(db: Session = Depends(get_db)):
    # Query all kardex movements joining product, lote and user
    results = db.query(
        KardexMovimiento,
        Producto.nombre_producto,
        Lote.nro_lote,
        Usuario.nombre_completo
    ).outerjoin(
        Producto, Producto.id == KardexMovimiento.producto_id
    ).outerjoin(
        Lote, Lote.id == KardexMovimiento.lote_id
    ).outerjoin(
        Usuario, Usuario.id == KardexMovimiento.usuario_id
    ).order_by(
        KardexMovimiento.fecha_registro.desc()
    ).all()

    # Extract unique reference IDs grouped by type
    venta_ids = {m.referencia_id for m, _, _, _ in results if m.referencia_tipo == "VENTA" and m.referencia_id}
    ingreso_ids = {m.referencia_id for m, _, _, _ in results if m.referencia_tipo == "INGRESO" and m.referencia_id}
    devolucion_ids = {m.referencia_id for m, _, _, _ in results if m.referencia_tipo == "DEVOLUCION" and m.referencia_id}
    ajuste_ids = {m.referencia_id for m, _, _, _ in results if m.referencia_tipo == "AJUSTE" and m.referencia_id}

    # Fetch reference document numbers in bulk to avoid N+1 queries
    ventas_map = {}
    if venta_ids:
        ventas = db.query(VentaHdr.id, VentaHdr.nro_comprobante).filter(VentaHdr.id.in_(list(venta_ids))).all()
        ventas_map = {v_id: v_nro for v_id, v_nro in ventas}

    ingresos_map = {}
    if ingreso_ids:
        ingresos = db.query(IngresoHdr.id, IngresoHdr.nro_comprobante).filter(IngresoHdr.id.in_(list(ingreso_ids))).all()
        ingresos_map = {i_id: i_nro for i_id, i_nro in ingresos}

    devoluciones_map = {}
    if devolucion_ids:
        from app.models.devolucion_model import DevolucionHdr
        devoluciones = db.query(
            DevolucionHdr.id, 
            DevolucionHdr.tipo_devolucion
        ).filter(
            DevolucionHdr.id.in_(list(devolucion_ids))
        ).all()
        for dev_id, dev_tipo in devoluciones:
            label = "Dev. Venta" if dev_tipo == "VENTA" else "Dev. Compra"
            devoluciones_map[dev_id] = f"{label} #{dev_id}"

    ajustes_map = {}
    if ajuste_ids:
        ajustes = db.query(AjusteInventario.id, AjusteInventario.tipo_ajuste).filter(AjusteInventario.id.in_(list(ajuste_ids))).all()
        ajustes_map = {aj_id: f"Ajuste {aj_tipo} #{aj_id}" for aj_id, aj_tipo in ajustes}

    # Format result
    resultado = []
    for m, prod_nombre, lote_nro, usr_nombre in results:
        ref_nro = "-"
        if m.referencia_tipo == "VENTA":
            ref_nro = ventas_map.get(m.referencia_id, f"Venta #{m.referencia_id}")
        elif m.referencia_tipo == "INGRESO":
            ref_nro = ingresos_map.get(m.referencia_id, f"Ingreso #{m.referencia_id}")
        elif m.referencia_tipo == "DEVOLUCION":
            ref_nro = devoluciones_map.get(m.referencia_id, f"Devolución #{m.referencia_id}")
        elif m.referencia_tipo == "AJUSTE":
            ref_nro = ajustes_map.get(m.referencia_id, f"Ajuste #{m.referencia_id}")

        resultado.append({
            "id": m.id,
            "producto": prod_nombre if prod_nombre else "-",
            "lote": lote_nro if lote_nro else "-",
            "tipo_movimiento": m.tipo_movimiento,
            "cantidad": float(m.cantidad) if m.cantidad is not None else 0.0,
            "stock_anterior": float(m.stock_anterior) if m.stock_anterior is not None else 0.0,
            "stock_posterior": float(m.stock_posterior) if m.stock_posterior is not None else 0.0,
            "referencia_tipo": m.referencia_tipo if m.referencia_tipo else "-",
            "referencia_id": m.referencia_id,
            "referencia_nro": ref_nro,
            "usuario": usr_nombre if usr_nombre else "-",
            "observacion": m.observacion if m.observacion else "-",
            "fecha_registro": m.fecha_registro
        })
    return resultado
