from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class IngresoDetalle(BaseModel):
    producto_id: int
    cantidad: int
    precio_costo: float
    fecha_vencimiento: Optional[datetime] = None

class IngresoRegistro(BaseModel):
    proveedor_id: int
    tipo_comprobante: str
    serie: Optional[str] = ""
    numero: Optional[str] = ""
    fecha_compra: datetime
    detalles: List[IngresoDetalle]

class IngresoDetalleResponse(BaseModel):
    id: int
    ingreso_id: int
    producto_id: int
    lote_id: Optional[int] = None
    cantidad: int
    precio_costo: float
    subtotal: float

    class Config:
        from_attributes = True

class IngresoResponse(BaseModel):
    id: int
    proveedor_id: int
    proveedor_nombre: Optional[str] = "-"
    tipo_comprobante: str
    serie: Optional[str] = ""
    numero: Optional[str] = ""
    nro_comprobante: Optional[str] = ""
    fecha_compra: Optional[datetime] = None
    fecha_registro: Optional[datetime] = None
    total: float
    usuario_id: int
    estado: str

    class Config:
        from_attributes = True