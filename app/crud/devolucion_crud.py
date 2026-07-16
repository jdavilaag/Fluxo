from sqlalchemy.orm import Session, aliased
from app.models.devolucion_model import DevolucionHdr, DevolucionDtl
from app.models.usuario_model import Usuario
from app.models.producto_model import Producto
from app.models.lote_model import Lote
from app.models.kardex_model import KardexMovimiento
from app.models.venta_model import VentaHdr
from app.models.ingreso_model import IngresoHdr
from app.schema.devolucion_schem import DevolucionRegistro
from fastapi import HTTPException
from decimal import Decimal

def get_devoluciones(db: Session):
    results = db.query(
        DevolucionHdr,
        Usuario.nombre_completo.label("usuario_nombre"),
        VentaHdr.nro_comprobante.label("venta_comprobante"),
        IngresoHdr.nro_comprobante.label("ingreso_comprobante")
    ).join(
        Usuario, Usuario.id == DevolucionHdr.usuario_id
    ).outerjoin(
        VentaHdr, VentaHdr.id == DevolucionHdr.venta_hdr_id
    ).outerjoin(
        IngresoHdr, IngresoHdr.id == DevolucionHdr.ingreso_hdr_id
    ).order_by(
        DevolucionHdr.fecha_registro.desc()
    ).all()

    devoluciones = []
    for dev, usr_name, v_comp, i_comp in results:
        dev.nombre_usuario = usr_name
        if dev.tipo_devolucion == "VENTA":
            dev.nro_comprobante = v_comp if v_comp else f"Venta #{dev.venta_hdr_id}"
        else:
            dev.nro_comprobante = i_comp if i_comp else f"Ingreso #{dev.ingreso_hdr_id}"
        devoluciones.append(dev)
    return devoluciones

def get_devolucion_by_id(db: Session, id: int):
    hdr = db.query(DevolucionHdr).filter(DevolucionHdr.id == id).first()
    if not hdr:
        return None
    
    usr = db.query(Usuario).filter(Usuario.id == hdr.usuario_id).first()
    hdr.nombre_usuario = usr.nombre_completo if usr else "Desconocido"

    if hdr.tipo_devolucion == "VENTA":
        doc = db.query(VentaHdr).filter(VentaHdr.id == hdr.venta_hdr_id).first()
        hdr.nro_comprobante = doc.nro_comprobante if doc else f"Venta #{hdr.venta_hdr_id}"
    else:
        doc = db.query(IngresoHdr).filter(IngresoHdr.id == hdr.ingreso_hdr_id).first()
        hdr.nro_comprobante = doc.nro_comprobante if doc else f"Ingreso #{hdr.ingreso_hdr_id}"

    details = db.query(
        DevolucionDtl,
        Producto.nombre_producto,
        Lote.nro_lote
    ).join(
        Producto, Producto.id == DevolucionDtl.producto_id
    ).outerjoin(
        Lote, Lote.id == DevolucionDtl.lote_id
    ).filter(
        DevolucionDtl.devolucion_hdr_id == id
    ).all()

    items = []
    for dtl, prod_name, lote_nro in details:
        dtl.nombre_producto = prod_name
        dtl.nro_lote = lote_nro if lote_nro else "-"
        items.append(dtl)
        
    hdr.items = items
    return hdr

def crear_devolucion(db: Session, data: DevolucionRegistro, usuario_id: int):
    try:
        # Verify document exists
        if data.tipo_devolucion == "VENTA":
            if not data.venta_hdr_id:
                raise HTTPException(status_code=400, detail="Falta venta_hdr_id para devolución de venta")
            venta = db.query(VentaHdr).filter(VentaHdr.id == data.venta_hdr_id).first()
            if not venta:
                raise HTTPException(status_code=404, detail="Venta no encontrada")
        elif data.tipo_devolucion == "COMPRA":
            if not data.ingreso_hdr_id:
                raise HTTPException(status_code=400, detail="Falta ingreso_hdr_id para devolución de compra")
            ingreso = db.query(IngresoHdr).filter(IngresoHdr.id == data.ingreso_hdr_id).first()
            if not ingreso:
                raise HTTPException(status_code=404, detail="Ingreso de compra no encontrado")
        else:
            raise HTTPException(status_code=400, detail="Tipo de devolución inválido")

        # Create Header
        hdr = DevolucionHdr(
            tipo_devolucion=data.tipo_devolucion,
            venta_hdr_id=data.venta_hdr_id,
            ingreso_hdr_id=data.ingreso_hdr_id,
            usuario_id=usuario_id,
            motivo=data.motivo,
            estado="REGISTRADO"
        )
        db.add(hdr)
        db.flush()

        # Process items
        for item in data.items:
            prod = db.query(Producto).filter(Producto.id == item.producto_id).first()
            if not prod:
                raise HTTPException(status_code=404, detail=f"Producto ID {item.producto_id} no encontrado")

            lote = None
            if item.lote_id:
                lote = db.query(Lote).filter(Lote.id == item.lote_id).first()
                if not lote:
                    raise HTTPException(status_code=404, detail=f"Lote ID {item.lote_id} no encontrado")

            cantidad_dec = Decimal(str(item.cantidad))
            subtotal_dec = Decimal(str(item.cantidad * item.precio_unitario))

            # Check stock changes
            stock_anterior = prod.stock_actual
            if data.tipo_devolucion == "VENTA":
                # Return of sale -> INCREASE stock
                prod.stock_actual += cantidad_dec
                if lote:
                    lote.stock_lote += cantidad_dec
                    if lote.estado == 0 and lote.stock_lote > 0:
                        lote.estado = 1
                tipo_mov = "ENTRADA"
            else: # COMPRA
                # Return of purchase -> DECREASE stock
                if prod.stock_actual < cantidad_dec:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Stock insuficiente del producto '{prod.nombre_producto}' para realizar la devolución de compra. Disponible: {prod.stock_actual}"
                    )
                if lote and lote.stock_lote < cantidad_dec:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Stock insuficiente en el lote '{lote.nro_lote}' para realizar la devolución de compra. Disponible: {lote.stock_lote}"
                    )

                prod.stock_actual -= cantidad_dec
                if lote:
                    lote.stock_lote -= cantidad_dec
                    if lote.stock_lote <= 0:
                        lote.stock_lote = 0
                        lote.estado = 0
                tipo_mov = "SALIDA"

            stock_posterior = prod.stock_actual

            # Create detail
            dtl = DevolucionDtl(
                devolucion_hdr_id=hdr.id,
                producto_id=item.producto_id,
                lote_id=item.lote_id,
                cantidad=item.cantidad,
                precio_unitario=item.precio_unitario,
                subtotal=float(subtotal_dec)
            )
            db.add(dtl)

            # Log Kardex
            kardex = KardexMovimiento(
                producto_id=item.producto_id,
                lote_id=item.lote_id,
                tipo_movimiento=tipo_mov,
                cantidad=item.cantidad,
                stock_anterior=stock_anterior,
                stock_posterior=stock_posterior,
                usuario_id=usuario_id,
                observacion=f"Devolución #{hdr.id} ({data.tipo_devolucion}): {data.motivo}",
                referencia_tipo="DEVOLUCION",
                referencia_id=hdr.id
            )
            db.add(kardex)

        db.commit()
        db.refresh(hdr)
        return get_devolucion_by_id(db, hdr.id)
    except Exception as e:
        db.rollback()
        raise e

def anular_devolucion(db: Session, id: int, usuario_id: int):
    try:
        hdr = db.query(DevolucionHdr).filter(DevolucionHdr.id == id).first()
        if not hdr:
            raise HTTPException(status_code=404, detail="Devolución no encontrada")
        if hdr.estado == "ANULADO":
            raise HTTPException(status_code=400, detail="Esta devolución ya está anulada")

        details = db.query(DevolucionDtl).filter(DevolucionDtl.devolucion_hdr_id == id).all()

        for dtl in details:
            prod = db.query(Producto).filter(Producto.id == dtl.producto_id).first()
            if not prod:
                continue
            
            lote = None
            if dtl.lote_id:
                lote = db.query(Lote).filter(Lote.id == dtl.lote_id).first()

            cantidad_dec = Decimal(str(dtl.cantidad))
            stock_anterior = prod.stock_actual

            if hdr.tipo_devolucion == "VENTA":
                # Reversing a sale return -> DECREASE stock
                if prod.stock_actual < cantidad_dec:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"No se puede anular porque no hay suficiente stock del producto '{prod.nombre_producto}'. Disponible: {prod.stock_actual}"
                    )
                if lote and lote.stock_lote < cantidad_dec:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"No se puede anular porque no hay suficiente stock en el lote '{lote.nro_lote}'. Disponible: {lote.stock_lote}"
                    )

                prod.stock_actual -= cantidad_dec
                if lote:
                    lote.stock_lote -= cantidad_dec
                    if lote.stock_lote <= 0:
                        lote.stock_lote = 0
                        lote.estado = 0
                tipo_mov = "SALIDA"
            else: # COMPRA
                # Reversing a purchase return -> INCREASE stock
                prod.stock_actual += cantidad_dec
                if lote:
                    lote.stock_lote += cantidad_dec
                    if lote.estado == 0 and lote.stock_lote > 0:
                        lote.estado = 1
                tipo_mov = "ENTRADA"

            stock_posterior = prod.stock_actual

            # Log Kardex
            kardex = KardexMovimiento(
                producto_id=dtl.producto_id,
                lote_id=dtl.lote_id,
                tipo_movimiento=tipo_mov,
                cantidad=dtl.cantidad,
                stock_anterior=stock_anterior,
                stock_posterior=stock_posterior,
                usuario_id=usuario_id,
                observacion=f"Anulación de Devolución #{hdr.id}",
                referencia_tipo="DEVOLUCION",
                referencia_id=hdr.id
            )
            db.add(kardex)

        hdr.estado = "ANULADO"
        db.commit()
        db.refresh(hdr)
        return get_devolucion_by_id(db, id)
    except Exception as e:
        db.rollback()
        raise e
