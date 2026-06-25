import sys
import os
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

# Add workspace root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append("d:\\FLUXO_ERP")

from app.conexion import engine

def main():
    print("Starting database schema migration for Comprobantes...")
    with engine.begin() as conn:
        # 1. Create comprobante_series table
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS `comprobante_series` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `tipo_comprobante` VARCHAR(50) NOT NULL,
            `serie` VARCHAR(10) NOT NULL UNIQUE,
            `correlativo_actual` INT NOT NULL DEFAULT 0,
            `estado` TINYINT(1) NOT NULL DEFAULT 1,
            `creado_en` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """
        conn.execute(text(create_table_sql))
        print("Table 'comprobante_series' checked/created.")

        # 2. Add columns to ventas_hdr
        columns_to_add = [
            ("tipo_comprobante", "VARCHAR(50) NULL"),
            ("serie", "VARCHAR(10) NULL"),
            ("numero", "VARCHAR(20) NULL"),
            ("nro_comprobante", "VARCHAR(50) NULL")
        ]

        for col_name, col_type in columns_to_add:
            alter_sql = f"ALTER TABLE `ventas_hdr` ADD COLUMN `{col_name}` {col_type}"
            try:
                conn.execute(text(alter_sql))
                print(f"Added column '{col_name}' to 'ventas_hdr'.")
            except OperationalError as e:
                # Error 1060 is "Duplicate column name" in MySQL
                if "1060" in str(e):
                    print(f"Column '{col_name}' already exists in 'ventas_hdr' (Skipped)")
                else:
                    print(f"Error adding column '{col_name}': {e}", file=sys.stderr)

        # 3. Add index on new columns in ventas_hdr
        for col_name in ["tipo_comprobante", "serie", "nro_comprobante"]:
            index_sql = f"ALTER TABLE `ventas_hdr` ADD INDEX `ix_ventas_hdr_{col_name}` (`{col_name}`)"
            try:
                conn.execute(text(index_sql))
                print(f"Added index for '{col_name}' in 'ventas_hdr'.")
            except OperationalError as e:
                # Error 1061 is "Duplicate key name"
                if "1061" in str(e):
                    print(f"Index for '{col_name}' already exists in 'ventas_hdr' (Skipped)")
                else:
                    print(f"Error creating index for '{col_name}': {e}", file=sys.stderr)

        # 4. Insert default rows into comprobante_series if empty
        check_series = conn.execute(text("SELECT COUNT(*) FROM `comprobante_series`"))
        count = check_series.scalar()
        if count == 0:
            insert_defaults = """
            INSERT INTO `comprobante_series` (`tipo_comprobante`, `serie`, `correlativo_actual`, `estado`) VALUES
            ('BOLETA', 'B001', 0, 1),
            ('FACTURA', 'F001', 0, 1),
            ('TICKET', 'T001', 0, 1);
            """
            conn.execute(text(insert_defaults))
            print("Inserted default Peruvian series: BOLETA (B001), FACTURA (F001), TICKET (T001).")
        else:
            print(f"Table 'comprobante_series' already has {count} entries. Default insertion skipped.")

    print("Migration finished successfully.")

if __name__ == "__main__":
    main()
