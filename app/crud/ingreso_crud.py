from sqlalchemy.orm import Session
from app.models.ingreso_model import IngresoHdr, IngresoDtl
from app.models.lote_model import Lote
from app.models.producto_model import Producto
from app.models.kardex_model import KardexMovimiento
from datetime import datetime

def crear_ingreso(db: Session, proveedor_id: int, tipo_comprobante: str, serie: str,
                  numero: str, fecha_compra: datetime, usuario_id: int, detalles: list):
    
    try:
        nro_comprobante = f"{serie}-{numero}" if serie and numero else numero
        total = sum(d["cantidad"] * d["precio_costo"] for d in detalles)

        ingreso = IngresoHdr(
            proveedor_id=proveedor_id,
            tipo_comprobante=tipo_comprobante,
            serie=serie,
            numero=numero,
            nro_comprobante=nro_comprobante,
            fecha_compra=fecha_compra,
            total=total,
            usuario_id=usuario_id,
            estado="REGISTRADO"
        )
        db.add(ingreso)
        db.flush()

        for d in detalles:
            # Crear lote
            lote = Lote(
                producto_id=d["producto_id"],
                fecha_vencimiento=d.get("fecha_vencimiento"),
                nro_lote=f"L{ingreso.id}-{d['producto_id']}",
                stock_lote=d["cantidad"],
                estado=1
            )
            db.add(lote)
            db.flush()

            # Detalle ingreso
            detalle = IngresoDtl(
                ingreso_id=ingreso.id,
                producto_id=d["producto_id"],
                lote_id=lote.id,
                cantidad=d["cantidad"],
                precio_costo=d["precio_costo"]
            )
            db.add(detalle)

            # Actualizar stock producto
            producto = db.query(Producto).filter(Producto.id == d["producto_id"]).first()
            if producto:
                stock_anterior = producto.stock_actual
                producto.stock_actual += d["cantidad"]
                producto.precio_compra = d["precio_costo"]

                # Kardex
                kardex = KardexMovimiento(
                    producto_id=d["producto_id"],
                    lote_id=lote.id,
                    tipo_movimiento="ENTRADA",
                    cantidad=d["cantidad"],
                    stock_anterior=stock_anterior,
                    stock_posterior=producto.stock_actual,
                    usuario_id=usuario_id,
                    observacion=f"Ingreso comprobante {nro_comprobante}"
                )
                db.add(kardex)

        db.commit()
        db.refresh(ingreso)
        return ingreso
    except Exception as e:
        db.rollback()
        raise e

from app.models.proveedor_model import Proveedor

def get_ingresos(db: Session):
    results = db.query(
        IngresoHdr,
        Proveedor.razon_social
    ).outerjoin(
        Proveedor, Proveedor.id == IngresoHdr.proveedor_id
    ).order_by(
        IngresoHdr.fecha_registro.desc()
    ).all()

    ingresos = []
    for ing, prov_nombre in results:
        ing.proveedor_nombre = prov_nombre if prov_nombre else "-"
        ingresos.append(ing)
    return ingresos

def get_ingreso_detalles(db: Session, ingreso_id: int):
    return db.query(IngresoDtl).filter(IngresoDtl.ingreso_id == ingreso_id).all()