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
    start_current_week = today - timedelta(days=6)
    dates = [start_current_week + timedelta(days=i) for i in range(7)]  # De hace 6 días a hoy
    
    sales_data = db.query(
        func.date(VentaHdr.fecha_venta).label("fecha"),
        func.sum(VentaHdr.total).label("total"),
        func.count(VentaHdr.id).label("cantidad")
    ).filter(
        VentaHdr.fecha_venta >= datetime.combine(start_current_week, datetime.min.time()),
        VentaHdr.estado != "ANULADO"
    ).group_by(
        func.date(VentaHdr.fecha_venta)
    ).all()

    sales_map = {}
    for row in sales_data:
        sales_map[str(row.fecha)] = (float(row.total or 0.0), int(row.cantidad or 0))

    ventas_semana = []
    days_of_week = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
    total_semana_actual = 0.0
    cantidad_semana_actual = 0
    for d in dates:
        day_name = days_of_week[(d.weekday() + 1) % 7]
        val = sales_map.get(str(d)) or (0.0, 0)
        total_semana_actual += val[0]
        cantidad_semana_actual += val[1]
        ventas_semana.append({
            "fecha": str(d),
            "dia": day_name,
            "total": val[0],
            "cantidad": val[1]
        })

    # Ventas de la semana anterior para comparar
    start_prev_week = today - timedelta(days=13)
    end_prev_week = today - timedelta(days=7)
    total_semana_anterior = db.query(func.sum(VentaHdr.total)).filter(
        VentaHdr.fecha_venta >= datetime.combine(start_prev_week, datetime.min.time()),
        VentaHdr.fecha_venta <= datetime.combine(end_prev_week, datetime.max.time()),
        VentaHdr.estado != "ANULADO"
    ).scalar() or 0.0

    ticket_promedio = (total_semana_actual / cantidad_semana_actual) if cantidad_semana_actual > 0 else 0.0
    nuevos_clientes = db.query(func.count(Cliente.id)).filter(
        Cliente.creado_en >= datetime.combine(start_current_week, datetime.min.time()),
        Cliente.estado == 1
    ).scalar() or 0

    # 6. Distribución de métodos de pago
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

    # 7. Ventas mensuales (últimos 6 meses)
    start_date_months = (today.replace(day=1) - timedelta(days=150)).replace(day=1)
    monthly_sales = db.query(
        func.year(VentaHdr.fecha_venta).label("year"),
        func.month(VentaHdr.fecha_venta).label("month"),
        func.sum(VentaHdr.total).label("total")
    ).filter(
        VentaHdr.fecha_venta >= datetime.combine(start_date_months, datetime.min.time()),
        VentaHdr.estado != "ANULADO"
    ).group_by(
        func.year(VentaHdr.fecha_venta),
        func.month(VentaHdr.fecha_venta)
    ).all()

    months_names = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"]
    last_6_months = []
    for i in range(5, -1, -1):
        m = today.month - i
        y = today.year
        while m <= 0:
            m += 12
            y -= 1
        last_6_months.append((y, m))

    monthly_map = {(int(row.year), int(row.month)): float(row.total or 0.0) for row in monthly_sales}
    ventas_mensuales = []
    for y, m in last_6_months:
        total_m = monthly_map.get((y, m)) or 0.0
        label = f"{months_names[m-1]} {y}"
        ventas_mensuales.append({
            "label": label,
            "total": total_m
        })

    # Métricas del mes actual, mes anterior y acumulado anual
    start_this_month = today.replace(day=1)
    total_this_month = db.query(func.sum(VentaHdr.total)).filter(
        VentaHdr.fecha_venta >= datetime.combine(start_this_month, datetime.min.time()),
        VentaHdr.estado != "ANULADO"
    ).scalar() or 0.0

    # Mes anterior
    end_prev_month = start_this_month - timedelta(days=1)
    start_prev_month = end_prev_month.replace(day=1)
    total_prev_month = db.query(func.sum(VentaHdr.total)).filter(
        VentaHdr.fecha_venta >= datetime.combine(start_prev_month, datetime.min.time()),
        VentaHdr.fecha_venta <= datetime.combine(end_prev_month, datetime.max.time()),
        VentaHdr.estado != "ANULADO"
    ).scalar() or 0.0

    # Acumulado anual
    start_this_year = today.replace(month=1, day=1)
    total_this_year = db.query(func.sum(VentaHdr.total)).filter(
        VentaHdr.fecha_venta >= datetime.combine(start_this_year, datetime.min.time()),
        VentaHdr.estado != "ANULADO"
    ).scalar() or 0.0

    # 8. Productos con bajo stock (stock_actual <= stock_minimo)
    low_stock = db.query(Producto).filter(
        Producto.stock_actual <= Producto.stock_minimo,
        Producto.estado == 1
    ).order_by(Producto.stock_actual.asc()).limit(5).all()

    productos_bajo_stock = []
    for p in low_stock:
        productos_bajo_stock.append({
            "id": p.id,
            "nombre": p.nombre_producto,
            "stock_actual": float(p.stock_actual or 0.0),
            "stock_minimo": float(p.stock_minimo or 0.0),
            "unidad": p.unidad_medida or "und"
        })

    # 9. Últimas 5 ventas con nombres de cliente
    recent_sales = db.query(
        VentaHdr, Cliente.nombres.label("cliente_nombre")
    ).outerjoin(
        Cliente, VentaHdr.cliente_id == Cliente.id
    ).order_by(
        VentaHdr.fecha_venta.desc()
    ).limit(5).all()

    ultimas_ventas = []
    for hdr, cliente_nombre in recent_sales:
        ultimas_ventas.append({
            "id": hdr.id,
            "nro_comprobante": hdr.nro_comprobante or f"V-{hdr.id:06d}",
            "fecha": hdr.fecha_venta.strftime("%d/%m/%Y %H:%M"),
            "cliente": cliente_nombre or "Cliente General",
            "total": float(hdr.total or 0.0),
            "estado": hdr.estado
        })

    return {
        "clientes": clientes_activos,
        "productos": productos_activos,
        "ventas_cantidad": ventas_cantidad,
        "ventas_total": round(ingresos_totales, 2),
        "ventas_semana": ventas_semana,
        "pagos_distribucion": pagos_distribucion,
        "semana_actual_total": round(total_semana_actual, 2),
        "semana_anterior_total": round(total_semana_anterior, 2),
        "ticket_promedio": round(ticket_promedio, 2),
        "nuevos_clientes": nuevos_clientes,
        "ventas_mensuales": ventas_mensuales,
        "mes_actual_total": round(total_this_month, 2),
        "mes_anterior_total": round(total_prev_month, 2),
        "acumulado_anual_total": round(total_this_year, 2),
        "productos_bajo_stock": productos_bajo_stock,
        "ultimas_ventas": ultimas_ventas
    }
