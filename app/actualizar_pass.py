import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from passlib.context import CryptContext

# 1. Cargar variables de entorno
load_dotenv()

# Si no tienes DATABASE_URL en tu .env local, introduce aquí directamente tu string de conexión de Railway:
# Ejemplo: "mysql+pymysql://root:password@host:port/fluxo"
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Si la variable de entorno no está configurada localmente, colócala aquí a mano:
    DATABASE_URL = "mysql+pymysql://root:vchTRgNhcYVtYTGFCwGOIgkmapnjFoqa@tokaido.proxy.rlwy.net:45399/fluxo"

# 2. Configurar encriptación
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
nueva_clave = "admin123"
hash_real = pwd_context.hash(nueva_clave)

print(f"-> Generando hash local para '{nueva_clave}': {hash_real}")

# 3. Conectar a la base de datos y actualizar
try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conexion:
        # Actualizamos la contraseña del usuario
        query = text("""
            UPDATE usuarios 
            SET password_hash = :nuevo_hash 
            WHERE email = 'admin@gmail.com'
        """)
        resultado = conexion.execute(query, {"nuevo_hash": hash_real})
        conexion.commit()
        
        print("-> ¡Éxito! Contraseña actualizada en la base de datos de Railway.")
        
        # Verificación rápida
        verificar = conexion.execute(
            text("SELECT email, password_hash FROM usuarios WHERE email = 'admin@gmail.com'")
        ).fetchone()
        print(f"-> Confirmado en BD: {verificar[0]} | Hash: {verificar[1]}")

except Exception as e:
    print(f"❌ Error al conectar o actualizar la base de datos: {e}")