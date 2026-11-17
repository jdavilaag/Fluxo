from typing import List
import re
import json
import urllib.request
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.security import obtener_password_hash

from app.conexion import get_db
from app.models.usuario_model import Usuario
from app.models.producto_model import Producto
from app.models.cliente_model import Cliente
from app.models.proveedor_model import Proveedor
from app.crud.usuario_crud import get_usuario_by_email, crear_usuario, verificar_password, get_usuarios
from app.schema.usuario_schem import UsuarioRegistro, UsuarioLogin, UsuarioResponse, UsuarioUpdate
from app.crud.rol_crud import get_permisos_by_rol
from app.dependencies import require_auth, require_permission

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/registro", response_model=UsuarioResponse)
def registro(data: UsuarioRegistro, db: Session = Depends(get_db), usuario: dict = Depends(require_permission("modulo:usuarios"))):
    if get_usuario_by_email(db, data.email):
        raise HTTPException(status_code=400, detail="Email ya registrado")
    # Validar nombre duplicado
    nombre_existe = db.query(Usuario).filter(
        Usuario.nombre_completo == data.nombre_completo
    ).first()
    if nombre_existe:
        raise HTTPException(status_code=400, detail="Ya existe un usuario con ese nombre")
    
    return crear_usuario(db, data.nombre_completo, data.email, data.password, data.rol_id, data.estado)

@router.post("/login")
def login(request: Request, data: UsuarioLogin, db: Session = Depends(get_db)):
    # Normalizamos el email: quitamos espacios y lo pasamos a minúsculas
    email_limpio = data.email.strip().lower()
    
    usuario = get_usuario_by_email(db, email_limpio)
    if not usuario or not verificar_password(data.password, usuario.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    
    if usuario.estado == 0:
        raise HTTPException(status_code=403, detail="Usuario inactivo")
    
    # Obtener los permisos del rol
    permisos = get_permisos_by_rol(db, usuario.rol_id)
    
    request.session["usuario"] = {
        "id": usuario.id,
        "nombre": usuario.nombre_completo,
        "email": usuario.email,
        "rol_id": usuario.rol_id,
        "permisos": permisos
    }
    print("Sesión guardada:", request.session.get("usuario"))
    return {"mensaje": "Login exitoso", "nombre": usuario.nombre_completo}

@router.get("/usuarios", response_model=List[UsuarioResponse])
def listar_usuarios(db: Session = Depends(get_db), usuario: dict = Depends(require_permission("modulo:usuarios"))):
    return get_usuarios(db)

@router.put("/usuarios/{usuario_id}", response_model=UsuarioResponse)
def actualizar_usuario(usuario_id: int, data: UsuarioUpdate, db: Session = Depends(get_db), usuario: dict = Depends(require_permission("modulo:usuarios"))):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    usuario.nombre_completo = data.nombre_completo
    usuario.email = data.email
    usuario.rol_id = data.rol_id
    usuario.estado = data.estado
    if data.password:
        usuario.password_hash = obtener_password_hash(data.password)
    db.commit()
    db.refresh(usuario)
    return usuario

@router.delete("/usuarios/{usuario_id}")
def eliminar_usuario(usuario_id: int, db: Session = Depends(get_db), usuario: dict = Depends(require_permission("modulo:usuarios"))):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    db.delete(usuario)
    db.commit()
    return {"mensaje": "Usuario eliminado"}


@router.get("/sesion")
def obtener_sesion(usuario: dict = Depends(require_auth)):
    return usuario


@router.get("/alertas-stock")
def obtener_alertas_stock(db: Session = Depends(get_db), usuario: dict = Depends(require_auth)):
    productos_bajos = db.query(Producto).filter(
        Producto.estado == 1,
        Producto.stock_actual <= Producto.stock_minimo
    ).order_by(
        Producto.stock_actual.asc(),
        Producto.nombre_producto.asc()
    ).all()

    items = []
    agotados = 0
    for p in productos_bajos:
        stock_act = float(p.stock_actual or 0)
        stock_min = float(p.stock_minimo or 0)
        es_agotado = stock_act <= 0
        if es_agotado:
            agotados += 1
        items.append({
            "id": p.id,
            "nombre": p.nombre_producto,
            "codigo": p.codigo_barras or "-",
            "stock_actual": stock_act,
            "stock_minimo": stock_min,
            "unidad": p.unidad_medida or "UND",
            "nivel": "AGOTADO" if es_agotado else "BAJO"
        })

    return {
        "total": len(items),
        "agotados": agotados,
        "bajos": len(items) - agotados,
        "items": items
    }


def _inferir_nombre_desde_email(email: str) -> str:
    local = email.split("@")[0].strip()
    # Reemplazar puntos, guiones y subguiones por espacios y quitar números finales
    limpio = re.sub(r"[._\-]+", " ", local)
    limpio = re.sub(r"\d+", " ", limpio)
    palabras = [p.capitalize() for p in limpio.split() if len(p) > 1]
    return " ".join(palabras)


@router.get("/autocompletar-email")
def autocompletar_por_email(
    email: str = Query(..., min_length=3),
    db: Session = Depends(get_db),
    usuario: dict = Depends(require_auth)
):
    email_clean = email.strip().lower()
    if not email_clean or "@" not in email_clean:
        return {"encontrado": False, "nombre_sugerido": ""}

    # 1. Buscar en Clientes
    cli = db.query(Cliente).filter(func.lower(Cliente.email) == email_clean).first()
    if cli:
        return {
            "encontrado": True,
            "origen": "CLIENTE",
            "id": cli.id,
            "nombre": cli.nombres,
            "documento": cli.documento or "",
            "telefono": cli.telefono or "",
            "direccion": cli.direccion or "",
            "email": cli.email or email_clean,
            "nombre_sugerido": cli.nombres
        }

    # 2. Buscar en Proveedores
    prov = db.query(Proveedor).filter(func.lower(Proveedor.email) == email_clean).first()
    if prov:
        return {
            "encontrado": True,
            "origen": "PROVEEDOR",
            "id": prov.id,
            "nombre": prov.razon_social,
            "documento": prov.ruc or "",
            "telefono": prov.telefono or "",
            "direccion": prov.direccion or "",
            "email": prov.email or email_clean,
            "nombre_sugerido": prov.razon_social
        }

    # 3. Buscar en Usuarios
    usr = db.query(Usuario).filter(func.lower(Usuario.email) == email_clean).first()
    if usr:
        return {
            "encontrado": True,
            "origen": "USUARIO",
            "id": usr.id,
            "nombre": usr.nombre_completo,
            "documento": "",
            "telefono": "",
            "direccion": "",
            "email": usr.email or email_clean,
            "nombre_sugerido": usr.nombre_completo
        }

    # 4. Inferencia inteligente desde el formato del correo
    sugerido = _inferir_nombre_desde_email(email_clean)
    return {
        "encontrado": False,
        "origen": "INFERENCIA",
        "nombre": sugerido,
        "documento": "",
        "telefono": "",
        "direccion": "",
        "email": email_clean,
        "nombre_sugerido": sugerido
    }


@router.get("/consultar-documento")
def consultar_documento(
    numero: str = Query(..., min_length=8, max_length=11),
    db: Session = Depends(get_db),
    usuario: dict = Depends(require_auth)
):
    doc = numero.strip()
    if not doc.isdigit() or len(doc) not in (8, 11):
        raise HTTPException(status_code=400, detail="El documento debe tener 8 dígitos (DNI) u 11 dígitos (RUC).")

    # 1. Buscar en Base de Datos Local (Clientes)
    cli = db.query(Cliente).filter(Cliente.documento == doc).first()
    if cli:
        return {
            "encontrado": True,
            "fuente": "BASE_DATOS",
            "tipo": "RUC" if len(doc) == 11 else "DNI",
            "documento": cli.documento,
            "nombre": cli.nombres,
            "direccion": cli.direccion or "",
            "telefono": cli.telefono or "",
            "email": cli.email or ""
        }

    # 2. Buscar en Base de Datos Local (Proveedores)
    prov = db.query(Proveedor).filter(Proveedor.ruc == doc).first()
    if prov:
        return {
            "encontrado": True,
            "fuente": "BASE_DATOS",
            "tipo": "RUC",
            "documento": prov.ruc,
            "nombre": prov.razon_social,
            "direccion": prov.direccion or "",
            "telefono": prov.telefono or "",
            "email": prov.email or ""
        }

    # 3. Consultar API pública de Padrón SUNAT / RENIEC
    tipo_api = "dni" if len(doc) == 8 else "ruc"
    url = f"https://api.apis.net.pe/v1/{tipo_api}?numero={doc}"
    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "FluxoERP/2.0", "Accept": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=3.5) as resp:
            if resp.status == 200:
                payload = json.loads(resp.read().decode("utf-8"))
                nombre = payload.get("nombre") or ""
                if not nombre and len(doc) == 8:
                    nombres = payload.get("nombres", "")
                    ap_pat = payload.get("apellidoPaterno", "")
                    ap_mat = payload.get("apellidoMaterno", "")
                    nombre = f"{nombres} {ap_pat} {ap_mat}".strip()
                direccion = payload.get("direccion") or ""
                if nombre:
                    return {
                        "encontrado": True,
                        "fuente": "SUNAT_RENIEC",
                        "tipo": tipo_api.upper(),
                        "documento": doc,
                        "nombre": nombre.title() if len(doc) == 8 else nombre,
                        "direccion": direccion,
                        "telefono": "",
                        "email": ""
                    }
    except Exception:
        pass

    return {
        "encontrado": False,
        "fuente": "NINGUNA",
        "tipo": tipo_api.upper(),
        "documento": doc,
        "nombre": "",
        "direccion": "",
        "telefono": "",
        "email": ""
    }