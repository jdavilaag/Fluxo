from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ComprobanteSerieBase(BaseModel):
    tipo_comprobante: str
    serie: str
    correlativo_actual: int = 0
    estado: int = 1

class ComprobanteSerieCreate(ComprobanteSerieBase):
    pass

class ComprobanteSerieResponse(ComprobanteSerieBase):
    id: int
    creado_en: Optional[datetime] = None

    class Config:
        from_attributes = True
