from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
from decimal import Decimal

class AjusteRegistro(BaseModel):
    producto_id: int
    lote_id: Optional[int] = None
    tipo_ajuste: str  # 'ENTRADA' or 'SALIDA'
    cantidad: Decimal
    motivo: str  # 'MERMA', 'ROBO', 'ERROR_CONTEO', 'VENCIMIENTO', 'OTRO'
    observacion: Optional[str] = ""

    @field_validator("tipo_ajuste")
    def validar_tipo_ajuste(cls, v):
        v_upper = v.upper()
        if v_upper not in ("ENTRADA", "SALIDA"):
            raise ValueError("El tipo de ajuste debe ser ENTRADA o SALIDA")
        return v_upper

    @field_validator("motivo")
    def validar_motivo(cls, v):
        v_upper = v.upper()
        if v_upper not in ("MERMA", "ROBO", "ERROR_CONTEO", "VENCIMIENTO", "OTRO"):
            raise ValueError("Motivo no válido")
        return v_upper

    @field_validator("cantidad")
    def validar_cantidad(cls, v):
        if v <= 0:
            raise ValueError("La cantidad debe ser mayor a 0")
        return v

class AjusteProcesar(BaseModel):
    aprobar: bool

class AjusteResponse(BaseModel):
    id: int
    producto_id: int
    producto_nombre: Optional[str] = None
    lote_id: Optional[int] = None
    nro_lote: Optional[str] = None
    usuario_solicitante_id: int
    usuario_solicitante_nombre: Optional[str] = None
    usuario_aprobador_id: Optional[int] = None
    usuario_aprobador_nombre: Optional[str] = None
    tipo_ajuste: str
    cantidad: Decimal
    motivo: str
    observacion: Optional[str] = ""
    estado: str
    fecha_solicitud: datetime
    fecha_aprobacion: Optional[datetime] = None

    class Config:
        from_attributes = True
