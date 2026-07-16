import mysql.connector

for db_name in ["fluxo", "railway"]:
    conn = mysql.connector.connect(
        host="tokaido.proxy.rlwy.net",
        port=45399,
        user="root",
        password="vchTRgNhcYVtYTGFCwGOIgkmapnjFoqa",
        database=db_name
    )
    cursor = conn.cursor()
    cursor.execute("SHOW TABLES")
    tablas = cursor.fetchall()
    print(f"--- Base: {db_name} ({len(tablas)} tablas) ---")
    for t in tablas:
        print(t[0])
    conn.close()