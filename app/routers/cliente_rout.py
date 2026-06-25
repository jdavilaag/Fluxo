from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.conexion import get_db
from app.models.cliente_model import Cliente
from app.crud.cliente_crud import get_cliente_by_documento, get_clientes, crear_cliente
from app.schema.cliente_schem import ClienteRegistro, ClienteResponse, ClienteUpdate
from app.dependencies import require_auth

router = APIRouter(prefix="/clientes", tags=["clientes"], dependencies=[Depends(require_auth)])

@router.post("/", response_model=ClienteResponse)
def registrar_cliente(data: ClienteRegistro, db: Session = Depends(get_db)):
    if get_cliente_by_documento(db, data.documento):
        raise HTTPException(status_code=400, detail="Documento ya registrado")
    return crear_cliente(db, data.documento, data.nombres, data.telefono, data.email, data.direccion, data.estado)

@router.get("/", response_model=List[ClienteResponse])
def listar_clientes(db: Session = Depends(get_db)):
    return get_clientes(db)

@router.put("/{cliente_id}", response_model=ClienteResponse)
def actualizar_cliente(cliente_id: int, data: ClienteUpdate, db: Session = Depends(get_db)):
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    cliente.documento = data.documento
    cliente.nombres = data.nombres
    cliente.telefono = data.telefono
    cliente.email = data.email
    cliente.direccion = data.direccion
    cliente.estado = data.estado
    db.commit()
    db.refresh(cliente)
    return cliente

@router.delete("/{cliente_id}")
def eliminar_cliente(cliente_id: int, db: Session = Depends(get_db)):
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    cliente.estado = 0
    db.commit()
    return {"mensaje": "Cliente desactivado"}