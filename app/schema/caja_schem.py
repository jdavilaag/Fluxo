from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AbrirCaja(BaseModel):
    monto_apertura: float
    usuario_id: int

class CerrarCaja(BaseModel):
    monto_cierre: float

class CajaResponse(BaseModel):
    id: int
    usuario_id: int
    fecha_apertura: Optional[datetime] = None
    fecha_cierre: Optional[datetime] = None
    monto_apertura: float
    monto_cierre: Optional[float] = None
    estado: str

    class Config:
        from_attributes = True

class CajaMovimientoResponse(BaseModel):
    id: int
    caja_id: int
    tipo: str
    monto: float
    descripcion: Optional[str] = ""
    referencia_id: Optional[int] = None
    fecha: Optional[datetime] = None

    class Config:
        from_attributes = True