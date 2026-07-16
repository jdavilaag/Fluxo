from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class DevolucionItem(BaseModel):
    producto_id: int
    lote_id: Optional[int] = None
    cantidad: float
    precio_unitario: float

class DevolucionRegistro(BaseModel):
    tipo_devolucion: str # 'VENTA' o 'COMPRA'
    venta_hdr_id: Optional[int] = None
    ingreso_hdr_id: Optional[int] = None
    motivo: str
    items: List[DevolucionItem]

class DevolucionDtlResponse(BaseModel):
    id: int
    producto_id: int
    nombre_producto: Optional[str] = None
    lote_id: Optional[int] = None
    nro_lote: Optional[str] = None
    cantidad: float
    precio_unitario: float
    subtotal: Optional[float] = None

    class Config:
        from_attributes = True

class DevolucionHdrResponse(BaseModel):
    id: int
    tipo_devolucion: str
    venta_hdr_id: Optional[int] = None
    ingreso_hdr_id: Optional[int] = None
    nro_comprobante: Optional[str] = None
    usuario_id: int
    nombre_usuario: Optional[str] = None
    motivo: str
    fecha_registro: Optional[datetime] = None
    estado: str
    items: Optional[List[DevolucionDtlResponse]] = None

    class Config:
        from_attributes = True
