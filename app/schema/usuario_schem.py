from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
import re

class UsuarioRegistro(BaseModel):
    nombre_completo: str
    email: str
    password: str
    rol_id: int = 1
    estado: int = 1

    @field_validator("password")
    def validar_password(cls, v):
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        if not re.search(r"[A-Z]", v):
            raise ValueError("La contraseña debe tener al menos una mayúscula")
        if not re.search(r"[0-9]", v):
            raise ValueError("La contraseña debe tener al menos un número")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("La contraseña debe tener al menos un carácter especial")
        return v

    @field_validator("email")
    def validar_email(cls, v):
        if not re.match(r"^[\w\.-]+@[\w\.-]+\.\w+$", v):
            raise ValueError("Email inválido")
        return v

    @field_validator("nombre_completo")
    def validar_nombre(cls, v):
        if len(v.strip()) < 3:
            raise ValueError("El nombre debe tener al menos 3 caracteres")
        return v.strip()



class UsuarioLogin(BaseModel):
    email: str
    password: str

class UsuarioResponse(BaseModel):
    id: int
    nombre_completo: str
    email: str
    rol_id: int
    estado: int
    creado_en: Optional[datetime] = None

    class Config:
        from_attributes = True

class UsuarioUpdate(BaseModel):
    nombre_completo: str
    email: str
    rol_id: int
    estado: int
    password: Optional[str] = None