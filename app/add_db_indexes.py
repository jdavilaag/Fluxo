import sys
import os
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

# Add workspace root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.conexion import engine

indexes = [
    # Table, Column, Index Name
    ("caja", "usuario_id", "ix_caja_usuario_id"),
    ("caja", "fecha_apertura", "ix_caja_fecha_apertura"),
    ("caja_movimientos", "caja_id", "ix_caja_movimientos_caja_id"),
    ("caja_movimientos", "fecha", "ix_caja_movimientos_fecha"),
    ("kardex_movimientos", "producto_id", "ix_kardex_movimientos_producto_id"),
    ("kardex_movimientos", "usuario_id", "ix_kardex_movimientos_usuario_id"),
    ("kardex_movimientos", "fecha_registro", "ix_kardex_movimientos_fecha_registro"),
    ("ventas_hdr", "cliente_id", "ix_ventas_hdr_cliente_id"),
    ("ventas_hdr", "fecha_venta", "ix_ventas_hdr_fecha_venta"),
    ("ventas_hdr", "usuario_id", "ix_ventas_hdr_usuario_id"),
    ("ventas_dtl", "venta_hdr_id", "ix_ventas_dtl_venta_hdr_id"),
    ("ventas_dtl", "producto_id", "ix_ventas_dtl_producto_id"),
    ("ventas_dtl", "lote_id", "ix_ventas_dtl_lote_id"),
    ("ventas_pagos", "venta_hdr_id", "ix_ventas_pagos_venta_hdr_id"),
    ("ingresos_hdr", "proveedor_id", "ix_ingresos_hdr_proveedor_id"),
    ("ingresos_hdr", "usuario_id", "ix_ingresos_hdr_usuario_id"),
    ("ingresos_hdr", "fecha_compra", "ix_ingresos_hdr_fecha_compra"),
    ("ingresos_hdr", "fecha_registro", "ix_ingresos_hdr_fecha_registro"),
    ("ingresos_dtl", "ingreso_hdr_id", "ix_ingresos_dtl_ingreso_hdr_id"),
    ("ingresos_dtl", "producto_id", "ix_ingresos_dtl_producto_id"),
    ("ingresos_dtl", "lote_id", "ix_ingresos_dtl_lote_id"),
    ("lotes", "producto_id", "ix_lotes_producto_id"),
    ("lotes", "fecha_ingreso", "ix_lotes_fecha_ingreso"),
    ("productos", "categoria_id", "ix_productos_categoria_id"),
    ("productos", "creado_en", "ix_productos_creado_en"),
    ("clientes", "creado_en", "ix_clientes_creado_en"),
    ("proveedores", "creado_en", "ix_proveedores_creado_en"),
]

def main():
    print("Starting database index creation...")
    with engine.begin() as conn:
        for table, col, index_name in indexes:
            sql = f"ALTER TABLE `{table}` ADD INDEX `{index_name}` (`{col}`)"
            try:
                conn.execute(text(sql))
                print(f"Successfully created index '{index_name}' on table '{table}' column '{col}'")
            except OperationalError as e:
                # Error 1061 is MySQL's "Duplicate key name"
                if "1061" in str(e):
                    print(f"Index '{index_name}' already exists on table '{table}' column '{col}' (Skipped)")
                else:
                    print(f"Error creating index '{index_name}': {e}", file=sys.stderr)
            except Exception as e:
                print(f"Unexpected error for index '{index_name}': {e}", file=sys.stderr)
    print("Database index creation finished.")

if __name__ == "__main__":
    main()
