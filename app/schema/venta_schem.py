from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class VentaDetalle(BaseModel):
    producto_id: int
    lote_id: Optional[int] = None
    cantidad: int
    precio_venta: float

class VentaRegistro(BaseModel):
    cliente_id: int
    detalles: List[VentaDetalle]
    metodo_pago: str = "EFECTIVO"
    monto_pago: float
    aplicar_igv: bool = False
    tipo_comprobante: Optional[str] = None
    serie: Optional[str] = None
    id_transaccion_api: Optional[str] = None
    proveedor_pago: Optional[str] = None

class VentaPagoResponse(BaseModel):
    id: int
    venta_id: int
    metodo_pago: str
    id_transaccion_api: Optional[str] = None
    proveedor_pago: Optional[str] = None
    monto: float
    estado_pago: str
    fecha_pago: datetime

    class Config:
        from_attributes = True

class VentaDetalleResponse(BaseModel):
    id: int
    venta_id: int
    producto_id: int
    lote_id: Optional[int] = None
    cantidad: int
    precio_venta: float
    subtotal: float

    class Config:
        from_attributes = True

class VentaResponse(BaseModel):
    id: int
    cliente_id: int
    cliente_nombre: Optional[str] = "-"
    fecha_venta: Optional[datetime] = None
    usuario_id: int
    subtotal: float
    igv: float
    total: float
    estado: str
    tipo_comprobante: Optional[str] = None
    serie: Optional[str] = None
    numero: Optional[str] = None
    nro_comprobante: Optional[str] = None

    class Config:
        from_attributes = True