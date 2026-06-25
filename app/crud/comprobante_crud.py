from sqlalchemy.orm import Session
from app.models.comprobante_model import ComprobanteSerie
from app.schema.comprobante_schem import ComprobanteSerieCreate
from fastapi import HTTPException

def get_comprobante_series(db: Session, include_inactive: bool = False):
    query = db.query(ComprobanteSerie)
    if not include_inactive:
        query = query.filter(ComprobanteSerie.estado == 1)
    return query.order_by(ComprobanteSerie.tipo_comprobante, ComprobanteSerie.serie).all()

def get_comprobante_serie_by_id(db: Session, series_id: int):
    return db.query(ComprobanteSerie).filter(ComprobanteSerie.id == series_id).first()

def get_comprobante_serie_by_prefix(db: Session, serie: str):
    return db.query(ComprobanteSerie).filter(ComprobanteSerie.serie == serie).first()

def crear_comprobante_serie(db: Session, data: ComprobanteSerieCreate):
    # Verify uniqueness of serie prefix
    existing = get_comprobante_serie_by_prefix(db, data.serie.upper())
    if existing:
        raise HTTPException(status_code=400, detail=f"La serie '{data.serie}' ya está registrada.")
    
    comprobante = ComprobanteSerie(
        tipo_comprobante=data.tipo_comprobante.upper(),
        serie=data.serie.upper(),
        correlativo_actual=data.correlativo_actual,
        estado=data.estado
    )
    db.add(comprobante)
    db.commit()
    db.refresh(comprobante)
    return comprobante

def actualizar_comprobante_serie(db: Session, series_id: int, data: ComprobanteSerieCreate):
    comprobante = get_comprobante_serie_by_id(db, series_id)
    if not comprobante:
        raise HTTPException(status_code=404, detail="Serie de comprobante no encontrada.")
    
    # Check if name is being changed and conflicts with another existing serie
    if comprobante.serie != data.serie.upper():
        existing = get_comprobante_serie_by_prefix(db, data.serie.upper())
        if existing:
            raise HTTPException(status_code=400, detail=f"La serie '{data.serie}' ya está registrada.")

    comprobante.tipo_comprobante = data.tipo_comprobante.upper()
    comprobante.serie = data.serie.upper()
    comprobante.correlativo_actual = data.correlativo_actual
    comprobante.estado = data.estado
    
    db.commit()
    db.refresh(comprobante)
    return comprobante

def logical_delete_comprobante_serie(db: Session, series_id: int):
    comprobante = get_comprobante_serie_by_id(db, series_id)
    if not comprobante:
        raise HTTPException(status_code=404, detail="Serie de comprobante no encontrada.")
    
    comprobante.estado = 0
    db.commit()
    db.refresh(comprobante)
    return comprobante

def obtener_proximo_correlativo(db: Session, tipo_comprobante: str, serie: str) -> str:
    comprobante = db.query(ComprobanteSerie).filter(
        ComprobanteSerie.tipo_comprobante == tipo_comprobante.upper(),
        ComprobanteSerie.serie == serie.upper(),
        ComprobanteSerie.estado == 1
    ).first()
    
    if not comprobante:
        raise HTTPException(status_code=400, detail=f"No se encontró una serie activa '{serie}' para comprobante '{tipo_comprobante}'.")
    
    next_num = comprobante.correlativo_actual + 1
    return str(next_num).zfill(8)

def incrementar_correlativo(db: Session, tipo_comprobante: str, serie: str) -> str:
    comprobante = db.query(ComprobanteSerie).filter(
        ComprobanteSerie.tipo_comprobante == tipo_comprobante.upper(),
        ComprobanteSerie.serie == serie.upper(),
        ComprobanteSerie.estado == 1
    ).with_for_update().first()  # Lock row to prevent race conditions
    
    if not comprobante:
        raise HTTPException(status_code=400, detail=f"No se encontró una serie activa '{serie}' para comprobante '{tipo_comprobante}'.")
    
    comprobante.correlativo_actual += 1
    db.flush()  # Push to database, will commit as part of the overall transaction
    
    return str(comprobante.correlativo_actual).zfill(8)
