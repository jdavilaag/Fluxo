# Fluxo Shop

Sistema web de punto de venta (POS) y control de inventario, diseñado para pequeños y medianos negocios. Gestiona ventas, stock, caja, clientes, proveedores y comprobantes electrónicos (SUNAT).

## Características

- **Ventas y caja**: registro de ventas, apertura/cierre de caja, comprobantes electrónicos (boletas/facturas SUNAT).
- **Inventario**: control de productos, categorías, proveedores, lotes y kardex (movimientos de stock).
- **Ingresos**: registro de ingresos de mercadería.
- **Ajustes y devoluciones**: gestión de ajustes de inventario y devoluciones de productos.
- **Usuarios y roles**: sistema de autenticación con roles y permisos diferenciados.
- **Pagos**: integración con Yape.
- **Dashboard**: panel de indicadores y resumen operativo.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Backend | FastAPI (Python) |
| Templates | Jinja2 |
| Frontend | HTML, CSS, JavaScript (HTMX) |
| Base de datos | MySQL |
| ORM | SQLAlchemy |
| Migraciones | Alembic |
| Entorno local | XAMPP |
| Producción (BD) | Railway |
| Despliegue (app) | Render |

## Estructura del proyecto

```
FLUXO_ERP/
├── app/
│   ├── crud/          # Operaciones CRUD por entidad
│   ├── models/        # Modelos SQLAlchemy
│   ├── routers/        # Endpoints FastAPI
│   ├── schema/         # Esquemas Pydantic
│   ├── security.py     # Autenticación y seguridad
│   └── dependencies.py
├── assets/
│   └── js/             # Lógica de frontend por módulo
├── layouts/             # Plantillas Jinja2 (HTML)
├── main.py              # Punto de entrada de la aplicación
└── FLUXO.sql            # Script DDL de la base de datos
```

## Base de datos

El esquema cuenta con 19 tablas normalizadas (convención `tablename_id` para llaves foráneas), cubriendo ventas, inventario, devoluciones, cajas y comprobantes electrónicos (`comprobante_series`).

## Instalación

### Requisitos previos

- Python 3.12+
- MySQL (o XAMPP para desarrollo local)
- pip

### Pasos

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/jdavilaag/Fluxo.git
   cd Fluxo
   ```

2. Crear y activar un entorno virtual:
   ```bash
   python -m venv venv
   venv\Scripts\activate   # Windows
   source venv/bin/activate  # Linux/Mac
   ```

3. Instalar dependencias:
   ```bash
   pip install -r requirements.txt
   ```

4. Configurar variables de entorno (`.env`):
   ```
   DATABASE_URL=mysql+pymysql://usuario:password@localhost/fluxo_db
   SECRET_KEY=tu_clave_secreta
   ```

5. Ejecutar migraciones:
   ```bash
   alembic upgrade head
   ```

6. Iniciar el servidor:
   ```bash
   uvicorn main:app --reload
   ```

7. Acceder a la aplicación en `http://localhost:8000`

## Endpoints principales

Cada módulo expone su propio router bajo `app/routers/`. A grandes rasgos:

| Router | Recurso | Descripción |
|---|---|---|
| `usuario_rout` | `/usuarios` | Registro, login y gestión de usuarios |
| `roles_rout` | `/roles` | Gestión de roles y permisos |
| `venta_rout` | `/ventas` | Registro y consulta de ventas |
| `caja_rout` | `/caja` | Apertura/cierre de caja y movimientos de efectivo |
| `producto_rout` | `/productos` | CRUD de productos |
| `categoria_rout` | `/categorias` | CRUD de categorías |
| `proveedor_rout` | `/proveedores` | CRUD de proveedores |
| `cliente_rout` | `/clientes` | CRUD de clientes |
| `ingreso_rout` | `/ingresos` | Registro de ingresos de mercadería |
| `kardex_rout` | `/kardex` | Consulta de movimientos de stock |
| `ajuste_rout` | `/ajustes` | Ajustes de inventario |
| `devolucion_rout` | `/devoluciones` | Devoluciones de productos |
| `movimientos_rout` | `/movimientos` | Historial general de movimientos |
| `comprobante_rout` | `/comprobantes` | Emisión de comprobantes electrónicos (SUNAT) |
| `yape_rout` | `/yape` | Integración de pagos con Yape |
| `dashboard_rout` | `/dashboard` | Indicadores y resumen operativo |

> Nota: los prefijos de ruta (`/ventas`, `/productos`, etc.) son orientativos según el nombre del recurso — ajústalos a los que definiste realmente con `APIRouter(prefix=...)` en cada archivo. Para documentación interactiva completa, FastAPI genera automáticamente Swagger UI en `/docs` y ReDoc en `/redoc` al levantar el servidor.

## Capturas de pantalla


Agrega aquí imágenes de las pantallas principales, por ejemplo:

### Dashboard
![alt text](image-1.png)

### Punto de venta
![alt text](image.png)

### Gestión de inventario
![alt text](image-2.png)

## Flujo de trabajo (Git)

El proyecto sigue una estrategia de ramas definida para el desarrollo (feature branches → main), con integración continua planificada para automatizar pruebas y despliegue.

## Roadmap

- [ ] Documentar endpoints de la API
- [ ] Agregar pruebas automatizadas
- [ ] Completar pipeline de CI/CD
- [ ] Desplegar en Render

## Licencia

Proyecto privado — todos los derechos reservados.