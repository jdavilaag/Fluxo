from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime

class RolRegistro(BaseModel):
    nombre_rol: str
    es_jefatura: int = 0
    estado: int = 1

    @field_validator("nombre_rol")
    def validar_nombre(cls, v):
        if len(v.strip()) < 3:
            raise ValueError("El nombre del rol debe tener al menos 3 caracteres")
        return v.strip()

class RolUpdate(BaseModel):
    nombre_rol: str
    es_jefatura: int
    estado: int

    @field_validator("nombre_rol")
    def validar_nombre(cls, v):
        if len(v.strip()) < 3:
            raise ValueError("El nombre del rol debe tener al menos 3 caracteres")
        return v.strip()

class RolResponse(BaseModel):
    id: int
    nombre_rol: str
    es_jefatura: int
    estado: int
    creado_en: Optional[datetime] = None

    class Config:
        from_attributes = True

class RolPermisosUpdate(BaseModel):
    permiso_keys: List[str]
