from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime

class ProductoRegistro(BaseModel):
    categoria_id: int
    codigo_barras: Optional[str] = ""
    nombre_producto: str
    precio_compra: float = 0
    precio_venta: float = 0
    maneja_vencimiento: int = 0
    stock_minimo: int = 0
    unidad_medida: Optional[str] = ""
    estado: int = 1

    @field_validator("nombre_producto")
    def validar_nombre(cls, v):
        if len(v.strip()) < 3:
            raise ValueError("El nombre debe tener al menos 3 caracteres")
        return v.strip()

    @field_validator("precio_venta")
    def validar_precio_venta(cls, v):
        if v < 0:
            raise ValueError("El precio de venta no puede ser negativo")
        return v

class ProductoResponse(BaseModel):
    id: int
    categoria_id: int
    codigo_barras: Optional[str] = ""
    nombre_producto: str
    precio_compra: float
    precio_venta: float
    maneja_vencimiento: int
    stock_actual: int
    stock_minimo: int
    unidad_medida: Optional[str] = ""
    estado: int
    creado_en: Optional[datetime] = None

    class Config:
        from_attributes = True

class ProductoUpdate(BaseModel):
    categoria_id: int
    codigo_barras: Optional[str] = ""
    nombre_producto: str
    precio_compra: float = 0
    precio_venta: float = 0
    maneja_vencimiento: int = 0
    stock_minimo: int = 0
    unidad_medida: Optional[str] = ""
    estado: int = 1