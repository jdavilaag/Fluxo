from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime

class CategoriaRegistro(BaseModel):
    nombre_categoria: str
    descripcion: Optional[str] = ""
    estado: int = 1

    @field_validator("nombre_categoria")
    def validar_nombre(cls, v):
        if len(v.strip()) < 3:
            raise ValueError("El nombre debe tener al menos 3 caracteres")
        return v.strip()

class CategoriaResponse(BaseModel):
    id: int
    nombre_categoria: str
    descripcion: Optional[str] = ""
    estado: int
    creado_en: Optional[datetime] = None

    class Config:
        from_attributes = True

class CategoriaUpdate(BaseModel):
    nombre_categoria: str
    descripcion: Optional[str] = ""
    estado: int