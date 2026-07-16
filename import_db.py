import mysql.connector

conn = mysql.connector.connect(
    host="tokaido.proxy.rlwy.net",
    port=45399,
    user="root",
    password="vchTRgNhcYVtYTGFCwGOIgkmapnjFoqa",
    database="railway"
)
cursor = conn.cursor()

with open(r"D:\FLUXO_ERP\FLUXO.sql", "r", encoding="utf-8") as f:
    sql_script = f.read()

for statement in sql_script.split(";"):
    if statement.strip():
        cursor.execute(statement)

conn.commit()
cursor.close()
conn.close()
print("Importación completada")