from sqlalchemy.orm import Session
from app.models.venta_model import VentaHdr, VentaDtl, VentaPago
from app.models.producto_model import Producto
from app.models.lote_model import Lote
from app.models.kardex_model import KardexMovimiento
from app.models.caja_model import CajaMovimiento
from app.models.comprobante_model import ComprobanteSerie
from app.crud.caja_crud import get_caja_activa
from app.crud.comprobante_crud import incrementar_correlativo
from fastapi import HTTPException

def crear_venta(db: Session, cliente_id: int, detalles: list, metodo_pago: str,
                monto_pago: float, aplicar_igv: bool, usuario_id: int,
                tipo_comprobante: str = None, serie: str = None,
                id_transaccion_api: str = None, proveedor_pago: str = None):

    try:
        # Verificar caja abierta
        caja = get_caja_activa(db)
        if not caja:
            raise HTTPException(status_code=400, detail="No hay caja abierta. Abra la caja antes de realizar ventas.")

        # Calcular totales
        subtotal = sum(d["cantidad"] * d["precio_venta"] for d in detalles)
        igv = round(subtotal * 0.18, 2) if aplicar_igv else 0
        total = round(subtotal + igv, 2)

        if monto_pago < total:
            raise HTTPException(status_code=400, detail=f"Monto insuficiente. Total: S/ {total}")

        # Validar e incrementar correlativo de comprobante
        numero = None
        nro_comprobante = None
        comprobante_serie_id = None
        if tipo_comprobante or serie:
            if not (tipo_comprobante and serie):
                raise HTTPException(status_code=400, detail="Debe especificar tipo de comprobante y serie.")
            
            comprobante_obj = db.query(ComprobanteSerie).filter(
                ComprobanteSerie.tipo_comprobante == tipo_comprobante.upper(),
                ComprobanteSerie.serie == serie.upper(),
                ComprobanteSerie.estado == 1
            ).first()
            if not comprobante_obj:
                raise HTTPException(status_code=400, detail=f"No se encontró una serie activa '{serie}' para comprobante '{tipo_comprobante}'.")
            comprobante_serie_id = comprobante_obj.id

            numero = incrementar_correlativo(db, tipo_comprobante, serie)
            nro_comprobante = f"{serie}-{numero}"

        # Crear cabecera
        venta = VentaHdr(
            cliente_id=cliente_id,
            usuario_id=usuario_id,
            caja_id=caja.id,
            comprobante_serie_id=comprobante_serie_id,
            subtotal=subtotal,
            igv=igv,
            total=total,
            estado="PAGADO",
            tipo_comprobante=tipo_comprobante,
            serie=serie,
            numero=numero,
            nro_comprobante=nro_comprobante
        )
        db.add(venta)
        db.flush()

        for d in detalles:
            # Buscar lote disponible
            lote = db.query(Lote).filter(
                Lote.producto_id == d["producto_id"],
                Lote.stock_lote >= d["cantidad"],
                Lote.estado == 1
            ).order_by(Lote.fecha_ingreso.asc()).first()

            if not lote:
                producto = db.query(Producto).filter(Producto.id == d["producto_id"]).first()
                raise HTTPException(status_code=400, detail=f"Stock insuficiente para {producto.nombre_producto}")

            # Actualizar lote
            lote.stock_lote -= d["cantidad"]
            if lote.stock_lote == 0:
                lote.estado = 0

            # Actualizar stock producto
            producto = db.query(Producto).filter(Producto.id == d["producto_id"]).first()
            stock_anterior = producto.stock_actual
            producto.stock_actual -= d["cantidad"]

            # Detalle venta
            detalle = VentaDtl(
                venta_id=venta.id,
                producto_id=d["producto_id"],
                lote_id=lote.id,
                cantidad=d["cantidad"],
                precio_venta=d["precio_venta"],
                subtotal=d["cantidad"] * d["precio_venta"]
            )
            db.add(detalle)

            # Kardex
            kardex = KardexMovimiento(
                producto_id=d["producto_id"],
                lote_id=lote.id,
                tipo_movimiento="SALIDA",
                cantidad=d["cantidad"],
                stock_anterior=stock_anterior,
                stock_posterior=producto.stock_actual,
                usuario_id=usuario_id,
                observacion=f"Venta #{venta.id}"
            )
            db.add(kardex)

        # Pago
        pago = VentaPago(
            venta_id=venta.id,
            metodo_pago=metodo_pago,
            id_transaccion_api=id_transaccion_api,
            proveedor_pago=proveedor_pago,
            monto=monto_pago,
            estado_pago="APROBADO"
        )
        db.add(pago)

        # Movimiento caja
        movimiento_caja = CajaMovimiento(
            caja_id=caja.id,
            tipo="VENTA",
            monto=total,
            descripcion=f"Venta #{venta.id}",
            referencia_id=venta.id
        )
        db.add(movimiento_caja)

        db.commit()
        db.refresh(venta)
        return venta
    except Exception as e:
        db.rollback()
        raise e

from app.models.cliente_model import Cliente

def get_ventas(db: Session):
    results = db.query(
        VentaHdr,
        Cliente.nombres
    ).outerjoin(
        Cliente, Cliente.id == VentaHdr.cliente_id
    ).order_by(
        VentaHdr.fecha_venta.desc()
    ).all()

    ventas = []
    for v, cliente_nombre in results:
        v.cliente_nombre = cliente_nombre if cliente_nombre else "-"
        ventas.append(v)
    return ventas

def get_venta_detalles(db: Session, venta_id: int):
    return db.query(VentaDtl).filter(VentaDtl.venta_id == venta_id).all()