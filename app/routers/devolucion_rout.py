from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.conexion import get_db
from app.dependencies import require_auth, require_permission
from app.crud.devolucion_crud import (
    get_devoluciones,
    get_devolucion_by_id,
    crear_devolucion,
    anular_devolucion
)
from app.schema.devolucion_schem import DevolucionRegistro, DevolucionHdrResponse
from app.models.venta_model import VentaHdr, VentaDtl
from app.models.ingreso_model import IngresoHdr, IngresoDtl
from app.models.producto_model import Producto
from app.models.lote_model import Lote

router = APIRouter(prefix="/auth/devoluciones", tags=["devoluciones"], dependencies=[Depends(require_permission("modulo:devoluciones"))])

@router.get("", response_model=List[DevolucionHdrResponse])
def listar_todas_las_devoluciones(db: Session = Depends(get_db)):
    return get_devoluciones(db)

@router.get("/{id}", response_model=DevolucionHdrResponse)
def obtener_detalle_devolucion(id: int, db: Session = Depends(get_db)):
    dev = get_devolucion_by_id(db, id)
    if not dev:
        raise HTTPException(status_code=404, detail="Devolución no encontrada")
    return dev

@router.post("", response_model=DevolucionHdrResponse)
def registrar_nueva_devolucion(request: Request, data: DevolucionRegistro, db: Session = Depends(get_db)):
    usuario = request.session.get("usuario")
    if not usuario:
        raise HTTPException(status_code=401, detail="No autorizado")
    return crear_devolucion(db, data, usuario["id"])

@router.post("/{id}/anular", response_model=DevolucionHdrResponse)
def anular_registro_devolucion(request: Request, id: int, db: Session = Depends(get_db)):
    usuario = request.session.get("usuario")
    if not usuario:
        raise HTTPException(status_code=401, detail="No autorizado")
    return anular_devolucion(db, id, usuario["id"])

@router.get("/documentos/{tipo}")
def obtener_documentos_elegibles(tipo: str, db: Session = Depends(get_db)):
    if tipo == "VENTA":
        # Get active/paid sales
        results = db.query(VentaHdr).filter(VentaHdr.estado != "ANULADO").order_by(VentaHdr.fecha_venta.desc()).all()
        return [{"id": r.id, "nro_comprobante": r.nro_comprobante or f"Venta #{r.id}", "fecha": r.fecha_venta, "total": r.total} for r in results]
    elif tipo == "COMPRA":
        # Get active purchases
        results = db.query(IngresoHdr).filter(IngresoHdr.estado != "ANULADO").order_by(IngresoHdr.fecha_registro.desc()).all()
        return [{"id": r.id, "nro_comprobante": r.nro_comprobante or f"Ingreso #{r.id}", "fecha": r.fecha_registro, "total": r.total} for r in results]
    else:
        raise HTTPException(status_code=400, detail="Tipo de documento inválido")

@router.get("/documentos/{tipo}/{id}/detalle")
def obtener_detalle_documento(tipo: str, id: int, db: Session = Depends(get_db)):
    if tipo == "VENTA":
        results = db.query(
            VentaDtl,
            Producto.nombre_producto,
            Lote.nro_lote
        ).join(
            Producto, Producto.id == VentaDtl.producto_id
        ).outerjoin(
            Lote, Lote.id == VentaDtl.lote_id
        ).filter(
            VentaDtl.venta_id == id
        ).all()
        
        items = []
        for dtl, prod_name, lote_nro in results:
            items.append({
                "producto_id": dtl.producto_id,
                "nombre_producto": prod_name,
                "lote_id": dtl.lote_id,
                "nro_lote": lote_nro if lote_nro else "-",
                "cantidad": dtl.cantidad,
                "precio_unitario": dtl.precio_venta
            })
        return items

    elif tipo == "COMPRA":
        results = db.query(
            IngresoDtl,
            Producto.nombre_producto,
            Lote.nro_lote
        ).join(
            Producto, Producto.id == IngresoDtl.producto_id
        ).outerjoin(
            Lote, Lote.id == IngresoDtl.lote_id
        ).filter(
            IngresoDtl.ingreso_id == id
        ).all()

        items = []
        for dtl, prod_name, lote_nro in results:
            items.append({
                "producto_id": dtl.producto_id,
                "nombre_producto": prod_name,
                "lote_id": dtl.lote_id,
                "nro_lote": lote_nro if lote_nro else "-",
                "cantidad": dtl.cantidad,
                "precio_unitario": dtl.precio_costo
            })
        return items
    else:
        raise HTTPException(status_code=400, detail="Tipo de documento inválido")
