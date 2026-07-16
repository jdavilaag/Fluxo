# 🚀 Fluxo ERP - Sistema de Gestión Empresarial

**Fluxo ERP** (también conocido como *Fluxo Shoop*) es un sistema de planificación de recursos empresariales (ERP) moderno, rápido y modular de escala mediana, diseñado para la administración de inventario, ventas, compras, caja chica y comprobantes de pago.

El sistema utiliza una arquitectura ágil y eficiente que combina el rendimiento del desarrollo backend en Python con una interfaz interactiva dinámica de tipo Single Page Application (SPA) gracias a **HTMX** (sin necesidad de pesados frameworks frontend como React o Angular).

---

## 🛠️ Arquitectura y Tecnologías

### Backend
- **Python 3.10+** como lenguaje de programación principal.
- **[FastAPI](https://fastapi.tiangolo.com/)** para la construcción de la API de alto rendimiento y el enrutamiento web.
- **[SQLAlchemy](https://www.sqlalchemy.org/)** como ORM (Object-Relational Mapping) para la abstracción y consulta de la base de datos.
- **PyMySQL** como controlador de conexión para bases de datos MySQL.
- **Passlib (con Bcrypt)** para la gestión segura de contraseñas de usuario.
- **Python-dotenv** para la carga dinámica de configuraciones desde archivos `.env`.
- **QRCode & Pillow** para la generación dinámica en tiempo real de códigos QR (ej. simulación de pagos con Yape).

### Frontend
- **[HTMX](https://htmx.org/)** para el intercambio asíncrono de HTML mediante peticiones AJAX directamente desde atributos HTML, logrando una experiencia fluida y reactiva.
- **Jinja2 Templates** para el renderizado del HTML desde el backend.
- **Bootstrap 5** como framework CSS para el diseño visual responsivo y estético.
- **Remix Icons** para toda la iconografía de la aplicación.
- **ApexCharts** para las visualizaciones y gráficos estadísticos en el panel de control.

### Base de Datos
- **MySQL 5.7+ / 8.0+**

---

## 📁 Estructura del Proyecto

```text
FLUXO_ERP/
├── app/                      # Lógica principal de la aplicación (Python)
│   ├── crud/                 # Operaciones de base de datos (CREATE, READ, UPDATE, DELETE)
│   ├── models/               # Modelos/Tablas ORM de SQLAlchemy
│   ├── routers/              # Controladores de rutas y endpoints de FastAPI
│   ├── schema/               # Schemas de validación de datos con Pydantic
│   ├── conexion.py           # Configuración del motor y la sesión de SQLAlchemy
│   ├── dependencies.py       # Dependencias de FastAPI (autenticación y permisos RBAC)
│   ├── security.py           # Lógica de encriptación de contraseñas
│   ├── add_roles_schema.py   # Script de migración de roles, permisos y roles_permisos
│   ├── add_comprobantes_schema.py # Script de migración de la tabla de comprobantes y series
│   └── add_db_indexes.py     # Script para la creación automática de índices en la BD
├── assets/                   # Archivos estáticos públicos (CSS, JS, Imágenes, Fuentes)
├── layouts/                  # Plantillas HTML de Jinja2 divididas por componentes y páginas
│   ├── dashboard.html        # Plantilla del panel de control principal
│   ├── login.html            # Interfaz de inicio de sesión
│   ├── navbar.html           # Barra de navegación superior
│   ├── sidebar.html          # Barra lateral de navegación de módulos
│   └── ...                   # Módulos individuales (ventas, compras, caja, etc.)
├── .env                      # Variables de entorno y configuración sensible
├── .gitignore                # Archivos y carpetas ignoradas en Git
├── FLUXO.sql                 # Script SQL básico para inicializar la base de datos
├── index.html                # Plantilla base y contenedor principal (SPA) del sistema
├── main.py                   # Punto de entrada de la aplicación FastAPI
└── requirements.txt          # Dependencias y librerías del proyecto
```

---

## ⚙️ Requisitos Previos

1. **Python 3.8+** instalado.
2. **MySQL Server** (local o remoto) en ejecución.

---

## 🚀 Instalación y Configuración Paso a Paso

### 1. Clonar el repositorio y acceder a la carpeta
```bash
git clone <URL_DEL_REPOSITORIO>
cd FLUXO_ERP
```

### 2. Crear y activar un entorno virtual
En Windows:
```bash
python -m venv venv
venv\Scripts\activate
```
En macOS/Linux:
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Instalar las dependencias
```bash
pip install -r requirements.txt
```

### 4. Configurar las variables de entorno
Crea un archivo `.env` en la raíz del proyecto basándote en la siguiente plantilla:
```env
DB_USER=tu_usuario_mysql
DB_PASSWORD=tu_contraseña_mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=fluxo_bd
SECRET_KEY=una-clave-muy-secreta-y-larga-2024
```
> ⚠️ **Nota:** Asegúrate de que el valor de `DB_NAME` coincida con el nombre de la base de datos que vayas a crear.

### 5. Crear la Base de Datos e Inicializar el Esquema
1. Inicia sesión en tu cliente de MySQL y crea la base de datos:
   ```sql
   -- Puedes guiarte del archivo FLUXO.sql
   CREATE DATABASE `fluxo_bd` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
   ```
2. Ejecuta los modelos y migraciones iniciales para crear las tablas necesarias de la base de datos si cuentas con un script dump.
3. Ejecuta los scripts incluidos en `app/` para crear tablas de soporte adicionales, poblar roles, añadir permisos y optimizar el rendimiento mediante índices:
   ```bash
   # Configura la tabla de roles, permisos por defecto y asignaciones
   python app/add_roles_schema.py

   # Configura las tablas de series de comprobantes (Boletas, Facturas, etc.)
   python app/add_comprobantes_schema.py

   # Agrega índices para búsquedas optimizadas en las tablas del ERP
   python app/add_db_indexes.py
   ```

---

## 🖥️ Ejecución de la Aplicación

Para iniciar el servidor de desarrollo, ejecuta el siguiente comando en la raíz del proyecto:
```bash
uvicorn main:app --reload
```

Una vez que el servidor esté corriendo, abre tu navegador e ingresa a:
👉 [http://localhost:8000](http://localhost:8000)

---

## 🔑 Roles y Seguridad del Sistema

El sistema implementa un modelo de **Control de Acceso Basado en Roles (RBAC)** con tres roles principales por defecto:

1. **Administrador** (Rol ID: 1): Acceso completo a todos los módulos y configuraciones del sistema.
2. **Vendedor** (Rol ID: 2): Acceso a Dashboard, Clientes, Caja Chica, Ventas y Comprobantes.
3. **Almacén** (Rol ID: 3): Acceso a Dashboard, Categorías, Productos, Ajustes, Proveedores, Ingresos, Kardex y Reporte de Movimientos.

Los permisos se verifican de manera estricta tanto en las peticiones AJAX enrutadas por FastAPI (mediante dependencias de seguridad) como visualmente en las plantillas cargadas dinámicamente con HTMX.
