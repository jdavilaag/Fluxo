from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
import re

class ProveedorRegistro(BaseModel):
    ruc: str
    razon_social: str
    telefono: Optional[str] = ""
    email: Optional[str] = ""
    direccion: Optional[str] = ""
    estado: int = 1

    @field_validator("ruc")
    def validar_ruc(cls, v):
        if not re.match(r"^\d{11}$", v):
            raise ValueError("El RUC debe tener 11 dígitos")
        return v

    @field_validator("razon_social")
    def validar_razon_social(cls, v):
        if len(v.strip()) < 3:
            raise ValueError("La razón social debe tener al menos 3 caracteres")
        return v.strip()

class ProveedorResponse(BaseModel):
    id: int
    ruc: str
    razon_social: str
    telefono: Optional[str] = ""
    email: Optional[str] = ""
    direccion: Optional[str] = ""
    estado: int
    creado_en: Optional[datetime] = None

    class Config:
        from_attributes = True

class ProveedorUpdate(BaseModel):
    ruc: str
    razon_social: str
    telefono: Optional[str] = ""
    email: Optional[str] = ""
    direccion: Optional[str] = ""
    estado: int