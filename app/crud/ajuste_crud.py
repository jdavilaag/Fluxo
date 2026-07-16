from sqlalchemy.orm import Session, aliased
from app.models.ajuste_model import AjusteInventario
from app.models.producto_model import Producto
from app.models.lote_model import Lote
from app.models.usuario_model import Usuario
from app.models.kardex_model import KardexMovimiento
from app.schema.ajuste_schem import AjusteRegistro
from fastapi import HTTPException
from sqlalchemy.sql import func

def get_ajustes(db: Session):
    solicitante = aliased(Usuario)
    aprobador = aliased(Usuario)
    
    results = db.query(
        AjusteInventario,
        Producto.nombre_producto,
        Lote.nro_lote,
        solicitante.nombre_completo.label("solicitante_nombre"),
        aprobador.nombre_completo.label("aprobador_nombre")
    ).join(
        Producto, Producto.id == AjusteInventario.producto_id
    ).outerjoin(
        Lote, Lote.id == AjusteInventario.lote_id
    ).join(
        solicitante, solicitante.id == AjusteInventario.usuario_solicitante_id
    ).outerjoin(
        aprobador, aprobador.id == AjusteInventario.usuario_aprobador_id
    ).order_by(
        AjusteInventario.fecha_solicitud.desc()
    ).all()

    ajustes = []
    for a, prod_nombre, lote_nro, sol_nombre, ap_nombre in results:
        a.producto_nombre = prod_nombre
        a.nro_lote = lote_nro if lote_nro else "-"
        a.usuario_solicitante_nombre = sol_nombre
        a.usuario_aprobador_nombre = ap_nombre if ap_nombre else "-"
        ajustes.append(a)
    return ajustes

def crear_ajuste(db: Session, data: AjusteRegistro, usuario_solicitante_id: int):
    # Verify product exists
    producto = db.query(Producto).filter(Producto.id == data.producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    # Verify lote if specified
    if data.lote_id:
        lote = db.query(Lote).filter(Lote.id == data.lote_id, Lote.producto_id == data.producto_id).first()
        if not lote:
            raise HTTPException(status_code=404, detail="Lote no encontrado para el producto especificado")

    ajuste = AjusteInventario(
        producto_id=data.producto_id,
        lote_id=data.lote_id,
        usuario_solicitante_id=usuario_solicitante_id,
        tipo_ajuste=data.tipo_ajuste,
        cantidad=data.cantidad,
        motivo=data.motivo,
        observacion=data.observacion,
        estado="PENDIENTE"
    )
    db.add(ajuste)
    db.commit()
    db.refresh(ajuste)
    return ajuste

def procesar_ajuste(db: Session, ajuste_id: int, usuario_aprobador_id: int, aprobar: bool):
    try:
        ajuste = db.query(AjusteInventario).filter(AjusteInventario.id == ajuste_id).first()
        if not ajuste:
            raise HTTPException(status_code=404, detail="Solicitud de ajuste no encontrada")
        
        if ajuste.estado != "PENDIENTE":
            raise HTTPException(status_code=400, detail="Esta solicitud ya ha sido procesada")
        
        producto = db.query(Producto).filter(Producto.id == ajuste.producto_id).first()
        if not producto:
            raise HTTPException(status_code=404, detail="Producto del ajuste no encontrado")
            
        lote = None
        if ajuste.lote_id:
            lote = db.query(Lote).filter(Lote.id == ajuste.lote_id).first()
            if not lote:
                raise HTTPException(status_code=404, detail="Lote del ajuste no encontrado")

        if aprobar:
            # Convert cantidad to Decimal to prevent operand type conflicts
            from decimal import Decimal
            cantidad_dec = Decimal(str(ajuste.cantidad))

            # Validate stock if SALIDA
            if ajuste.tipo_ajuste == "SALIDA":
                if producto.stock_actual < cantidad_dec:
                    raise HTTPException(status_code=400, detail=f"Stock insuficiente del producto para realizar la salida. Disponible: {producto.stock_actual}")
                if lote and lote.stock_lote < cantidad_dec:
                    raise HTTPException(status_code=400, detail=f"Stock insuficiente en el lote para realizar la salida. Disponible en lote: {lote.stock_lote}")

            # Update product stock
            stock_anterior = producto.stock_actual
            if ajuste.tipo_ajuste == "ENTRADA":
                producto.stock_actual += cantidad_dec
            else:
                producto.stock_actual -= cantidad_dec
                
            stock_posterior = producto.stock_actual

            # Update lote stock if specified
            if lote:
                if ajuste.tipo_ajuste == "ENTRADA":
                    lote.stock_lote += cantidad_dec
                    if lote.estado == 0 and lote.stock_lote > 0:
                        lote.estado = 1
                else:
                    lote.stock_lote -= cantidad_dec
                    if lote.stock_lote <= 0:
                        lote.stock_lote = 0
                        lote.estado = 0

            # Register Kardex
            tipo_mov_kardex = "ENTRADA" if ajuste.tipo_ajuste == "ENTRADA" else "SALIDA"
            kardex = KardexMovimiento(
                producto_id=ajuste.producto_id,
                lote_id=ajuste.lote_id,
                tipo_movimiento=tipo_mov_kardex,
                cantidad=ajuste.cantidad,
                stock_anterior=stock_anterior,
                stock_posterior=stock_posterior,
                usuario_id=usuario_aprobador_id,
                observacion=f"Ajuste #{ajuste.id} ({ajuste.motivo}): {ajuste.observacion or ''}",
                referencia_tipo="AJUSTE",
                referencia_id=ajuste.id
            )
            db.add(kardex)
            
            ajuste.estado = "APROBADO"
        else:
            ajuste.estado = "RECHAZADO"

        ajuste.usuario_aprobador_id = usuario_aprobador_id
        ajuste.fecha_aprobacion = func.now()
        
        db.commit()
        db.refresh(ajuste)
        return ajuste
    except Exception as e:
        db.rollback()
        raise e
