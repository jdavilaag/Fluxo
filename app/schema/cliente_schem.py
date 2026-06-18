from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
import re

class ClienteRegistro(BaseModel):
    documento: str
    nombres: str
    telefono: Optional[str] = ""
    email: Optional[str] = ""
    direccion: Optional[str] = ""
    estado: int = 1

    @field_validator("documento")
    def validar_documento(cls, v):
        if not re.match(r"^\d{8,11}$", v):
            raise ValueError("El documento debe tener entre 8 y 11 dígitos")
        return v

    @field_validator("nombres")
    def validar_nombres(cls, v):
        if len(v.strip()) < 3:
            raise ValueError("El nombre debe tener al menos 3 caracteres")
        return v.strip()

class ClienteResponse(BaseModel):
    id: int
    documento: str
    nombres: str
    telefono: Optional[str] = ""
    email: Optional[str] = ""
    direccion: Optional[str] = ""
    estado: int
    creado_en: Optional[datetime] = None

    class Config:
        from_attributes = True

class ClienteUpdate(BaseModel):
    documento: str
    nombres: str
    telefono: Optional[str] = ""
    email: Optional[str] = ""
    direccion: Optional[str] = ""
    estado: int