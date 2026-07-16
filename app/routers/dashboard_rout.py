from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app.conexion import get_db
from app.dependencies import require_permission
from app.models.cliente_model import Cliente
from app.models.producto_model import Producto
from app.models.venta_model import VentaHdr, VentaPago
from app.models.usuario_model import Usuario

router = APIRouter(prefix="/auth/dashboard", tags=["dashboard"], dependencies=[Depends(require_permission("modulo:dashboard"))])

@router.get("/stats")
def obtener_metricas_dashboard(db: Session = Depends(get_db)):
    # 1. Clientes Activos
    clientes_activos = db.query(func.count(Cliente.id)).filter(Cliente.estado == 1).scalar() or 0

    # 2. Productos Activos
    productos_activos = db.query(func.count(Producto.id)).filter(Producto.estado == 1).scalar() or 0

    # 3. Ventas Realizadas (conteo)
    ventas_cantidad = db.query(func.count(VentaHdr.id)).filter(VentaHdr.estado != "ANULADO").scalar() or 0

    # 4. Ingresos Totales (suma)
    ingresos_totales = db.query(func.sum(VentaHdr.total)).filter(VentaHdr.estado != "ANULADO").scalar() or 0.0

    # 5. Ventas diarias de los últimos 7 días
    today = datetime.now().date()
    dates = [today - timedelta(days=i) for i in range(6, -1, -1)]  # De hace 6 días a hoy
    
    sales_data = db.query(
        func.date(VentaHdr.fecha_venta).label("fecha"),
        func.sum(VentaHdr.total).label("total"),
        func.count(VentaHdr.id).label("cantidad")
    ).filter(
        VentaHdr.fecha_venta >= datetime.combine(dates[0], datetime.min.time()),
        VentaHdr.estado != "ANULADO"
    ).group_by(
        func.date(VentaHdr.fecha_venta)
    ).all()

    sales_map = {}
    for row in sales_data:
        # Asegurar llave string YYYY-MM-DD
        sales_map[str(row.fecha)] = (float(row.total or 0.0), int(row.cantidad or 0))

    ventas_semana = []
    days_of_week = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
    for d in dates:
        day_name = days_of_week[(d.weekday() + 1) % 7]
        val = sales_map.get(str(d)) or (0.0, 0)
        ventas_semana.append({
            "fecha": str(d),
            "dia": day_name,
            "total": val[0],
            "cantidad": val[1]
        })

    # 6. Distribución de métodos de pago para gráfico tipo Pay
    payment_data = db.query(
        VentaPago.metodo_pago,
        func.sum(VentaPago.monto).label("total")
    ).join(
        VentaHdr, VentaHdr.id == VentaPago.venta_id
    ).filter(
        VentaHdr.estado != "ANULADO"
    ).group_by(
        VentaPago.metodo_pago
    ).all()

    pagos_distribucion = []
    for row in payment_data:
        pagos_distribucion.append({
            "metodo": row.metodo_pago or "Otro",
            "total": float(row.total or 0.0)
        })

    return {
        "clientes": clientes_activos,
        "productos": productos_activos,
        "ventas_cantidad": ventas_cantidad,
        "ventas_total": round(ingresos_totales, 2),
        "ventas_semana": ventas_semana,
        "pagos_distribucion": pagos_distribucion
    }
