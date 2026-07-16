from fastapi import FastAPI, Request
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, HTMLResponse
from starlette.middleware.sessions import SessionMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from app.routers.usuario_rout import router as auth_router
from app.routers.categoria_rout import router as categoria_router
from app.routers.proveedor_rout import router as proveedor_router
from app.routers.producto_rout import router as producto_router
from app.routers.cliente_rout import router as cliente_router
from app.routers.caja_rout import router as caja_router
from app.routers.venta_rout import router as venta_router
from app.routers.yape_rout import router as yape_router
from app.routers.kardex_rout import router as kardex_router
from app.routers.ingreso_rout import router as ingreso_router
from app.routers.comprobante_rout import router as comprobante_router
from app.routers.ajuste_rout import router as ajuste_router
from app.routers.roles_rout import router as roles_router
from app.routers.devolucion_rout import router as devolucion_router
from app.routers.movimientos_rout import router as movimientos_router
from app.routers.dashboard_rout import router as dashboard_api_router
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

class NoCacheMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response

app.add_middleware(NoCacheMiddleware)

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SECRET_KEY", "clave-secreta-segura"),
    same_site="lax",
    https_only=False,
    max_age=1800  # 30 minutos
)

# Agregar rutas y montar archivos estáticos
app.include_router(auth_router)
app.include_router(roles_router)
app.include_router(categoria_router)
app.include_router(proveedor_router)
app.include_router(producto_router)
app.include_router(cliente_router)
app.include_router(caja_router)
app.include_router(venta_router)
app.include_router(yape_router)
app.include_router(comprobante_router)
app.include_router(ajuste_router)
app.include_router(devolucion_router)
app.include_router(movimientos_router)
app.include_router(dashboard_api_router)
app.mount("/assets", StaticFiles(directory="assets"), name="assets")
templates = Jinja2Templates(directory=".")

def verificar_permiso(request: Request, permiso: str):
    usuario = request.session.get("usuario")
    if not usuario:
        return False
    # El Administrador (rol_id == 1) tiene acceso a todo por defecto
    if usuario.get("rol_id") == 1:
        return True
    permisos = usuario.get("permisos", [])
    return permiso in permisos

def respuesta_no_autorizado(request: Request):
    if request.headers.get("hx-request") == "true":
        return HTMLResponse(
            """
            <div class="container-fluid mt-4">
                <div class="alert alert-danger d-flex align-items-center" role="alert">
                    <i class="ri-error-warning-fill fs-24 me-2"></i>
                    <div>
                        <h5 class="alert-heading mb-1 fw-bold">Acceso Denegado</h5>
                        No tienes los permisos necesarios para visualizar este módulo.
                    </div>
                </div>
            </div>
            """,
            status_code=403
        )
    return RedirectResponse(url="/")


@app.get("/")
def index(request: Request):
    if not request.session.get("usuario"):
        return RedirectResponse(url="/login")
    return templates.TemplateResponse(request=request, name="index.html")

@app.get("/login")
def login_page(request: Request):
    if request.session.get("usuario"):
        return RedirectResponse(url="/")
    return templates.TemplateResponse(request=request, name="layouts/login.html")

@app.get("/dashboard")
def dashboard(request: Request):
    if not request.session.get("usuario"):
        return RedirectResponse(url="/login")
    if not verificar_permiso(request, "modulo:dashboard"):
        return respuesta_no_autorizado(request)
    return templates.TemplateResponse(request=request, name="layouts/dashboard.html")

@app.get("/users")
def users(request: Request):
    if not request.session.get("usuario"):
        return RedirectResponse(url="/login")
    if not verificar_permiso(request, "modulo:usuarios"):
        return respuesta_no_autorizado(request)
    return templates.TemplateResponse(request=request, name="layouts/users.html")

@app.get("/roles")
def roles(request: Request):
    if not request.session.get("usuario"):
        return RedirectResponse(url="/login")
    if not verificar_permiso(request, "modulo:roles"):
        return respuesta_no_autorizado(request)
    return templates.TemplateResponse(request=request, name="layouts/roles.html")

@app.get("/logout")
def logout(request: Request):
    request.session.clear()
    response = RedirectResponse(url="/login")
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.get("/categorias")
def categorias(request: Request):
    if not request.session.get("usuario"):
        return RedirectResponse(url="/login")
    if not verificar_permiso(request, "modulo:categorias"):
        return respuesta_no_autorizado(request)
    return templates.TemplateResponse(request=request, name="layouts/categorias.html")

@app.get("/proveedor")
def proveedores(request: Request):
    if not request.session.get("usuario"):
        return RedirectResponse(url="/login")
    if not verificar_permiso(request, "modulo:proveedores"):
        return respuesta_no_autorizado(request)
    return templates.TemplateResponse(request=request, name="layouts/proveedor.html")

@app.get("/productos")
def productos(request: Request):
    if not request.session.get("usuario"):
        return RedirectResponse(url="/login")
    if not verificar_permiso(request, "modulo:productos"):
        return respuesta_no_autorizado(request)
    return templates.TemplateResponse(request=request, name="layouts/producto.html")

@app.get("/clientes")
def clientes(request: Request):
    if not request.session.get("usuario"):
        return RedirectResponse(url="/login")
    if not verificar_permiso(request, "modulo:clientes"):
        return respuesta_no_autorizado(request)
    return templates.TemplateResponse(request=request, name="layouts/cliente.html")

@app.get("/caja")
def caja(request: Request):
    if not request.session.get("usuario"):
        return RedirectResponse(url="/login")
    if not verificar_permiso(request, "modulo:caja"):
        return respuesta_no_autorizado(request)
    return templates.TemplateResponse(request=request, name="layouts/caja.html")

from app.routers.ingreso_rout import router as ingreso_router

app.include_router(ingreso_router)

@app.get("/ingresos")
def ingresos(request: Request):
    if not request.session.get("usuario"):
        return RedirectResponse(url="/login")
    if not verificar_permiso(request, "modulo:ingresos"):
        return respuesta_no_autorizado(request)
    return templates.TemplateResponse(request=request, name="layouts/ingresos.html")

@app.get("/ventas")
def ventas(request: Request):
    if not request.session.get("usuario"):
        return RedirectResponse(url="/login")
    if not verificar_permiso(request, "modulo:ventas"):
        return respuesta_no_autorizado(request)
    return templates.TemplateResponse(request=request, name="layouts/ventas.html")

from app.routers.kardex_rout import router as kardex_router

app.include_router(kardex_router)

@app.get("/kardex")
def kardex(request: Request):
    if not request.session.get("usuario"):
        return RedirectResponse(url="/login")
    if not verificar_permiso(request, "reporte:kardex"):
        return respuesta_no_autorizado(request)
    return templates.TemplateResponse(request=request, name="layouts/kardex.html")

@app.get("/comprobantes")
def comprobantes(request: Request):
    if not request.session.get("usuario"):
        return RedirectResponse(url="/login")
    if not verificar_permiso(request, "modulo:comprobantes"):
        return respuesta_no_autorizado(request)
    return templates.TemplateResponse(request=request, name="layouts/comprobantes.html")

@app.get("/ajustes")
def ajustes(request: Request):
    if not request.session.get("usuario"):
        return RedirectResponse(url="/login")
    if not verificar_permiso(request, "modulo:ajustes"):
        return respuesta_no_autorizado(request)
    return templates.TemplateResponse(request=request, name="layouts/ajustes.html")

@app.get("/devoluciones")
def devoluciones(request: Request):
    if not request.session.get("usuario"):
        return RedirectResponse(url="/login")
    if not verificar_permiso(request, "modulo:devoluciones"):
        return respuesta_no_autorizado(request)
    return templates.TemplateResponse(request=request, name="layouts/devoluciones.html")

@app.get("/movimientos")
def movimientos(request: Request):
    if not request.session.get("usuario"):
        return RedirectResponse(url="/login")
    if not verificar_permiso(request, "reporte:movimientos"):
        return respuesta_no_autorizado(request)
    return templates.TemplateResponse(request=request, name="layouts/movimientos.html")