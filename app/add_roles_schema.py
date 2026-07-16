import sys
import os
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

# Add workspace root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append("d:\\FLUXO_ERP")

from app.conexion import engine

def main():
    print("Starting database schema migration for Roles and Permissions...")
    with engine.begin() as conn:
        # 1. Modify roles table to add es_jefatura, estado, creado_en
        columns_to_add = [
            ("es_jefatura", "TINYINT(1) NOT NULL DEFAULT 0"),
            ("estado", "TINYINT(1) NOT NULL DEFAULT 1"),
            ("creado_en", "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP")
        ]

        for col_name, col_type in columns_to_add:
            alter_sql = f"ALTER TABLE `roles` ADD COLUMN `{col_name}` {col_type}"
            try:
                conn.execute(text(alter_sql))
                print(f"Added column '{col_name}' to 'roles'.")
            except OperationalError as e:
                # Error 1060 is "Duplicate column name" in MySQL
                if "1060" in str(e):
                    print(f"Column '{col_name}' already exists in 'roles' (Skipped)")
                else:
                    print(f"Error adding column '{col_name}': {e}", file=sys.stderr)

        # 2. Create roles_permisos table
        create_permisos_sql = """
        CREATE TABLE IF NOT EXISTS `roles_permisos` (
            `rol_id` INT NOT NULL,
            `permiso_key` VARCHAR(100) NOT NULL,
            PRIMARY KEY (`rol_id`, `permiso_key`),
            CONSTRAINT `fk_roles_permisos_rol` FOREIGN KEY (`rol_id`) 
                REFERENCES `roles` (`rol_id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """
        try:
            conn.execute(text(create_permisos_sql))
            print("Table 'roles_permisos' checked/created.")
        except Exception as e:
            print(f"Error creating table 'roles_permisos': {e}", file=sys.stderr)

        # 3. Seed default roles (1: Administrador, 2: Vendedor, 3: Almacén)
        default_roles = [
            (1, "Administrador", 1, 1),
            (2, "Vendedor", 0, 1),
            (3, "Almacén", 0, 1)
        ]

        for r_id, r_name, es_jef, est in default_roles:
            # Check if role exists
            res = conn.execute(text("SELECT COUNT(*) FROM `roles` WHERE `rol_id` = :id"), {"id": r_id})
            count = res.scalar()
            if count == 0:
                insert_role = """
                INSERT INTO `roles` (`rol_id`, `nombre_rol`, `es_jefatura`, `estado`)
                VALUES (:id, :name, :es_jef, :est)
                """
                conn.execute(text(insert_role), {"id": r_id, "name": r_name, "es_jef": es_jef, "est": est})
                print(f"Inserted role '{r_name}' (ID: {r_id}).")
            else:
                # Update existing role to set new fields
                update_role = """
                UPDATE `roles` 
                SET `es_jefatura` = :es_jef, `estado` = :est 
                WHERE `rol_id` = :id
                """
                conn.execute(text(update_role), {"id": r_id, "es_jef": es_jef, "est": est})
                print(f"Updated fields for existing role '{r_name}' (ID: {r_id}).")

        # 4. Seed default permissions for roles
        # Permisos del Administrador (Todas las funcionalidades)
        admin_permissions = [
            "modulo:dashboard",
            "modulo:usuarios",
            "modulo:roles",
            "modulo:categorias",
            "modulo:productos",
            "modulo:ajustes",
            "modulo:proveedores",
            "modulo:ingresos",
            "modulo:clientes",
            "modulo:caja",
            "modulo:ventas",
            "modulo:comprobantes",
            "reporte:kardex",
            "reporte:movimientos"
        ]

        # Permisos del Vendedor
        vendedor_permissions = [
            "modulo:dashboard",
            "modulo:clientes",
            "modulo:caja",
            "modulo:ventas",
            "modulo:comprobantes"
        ]

        # Permisos del personal de Almacén
        almacen_permissions = [
            "modulo:dashboard",
            "modulo:categorias",
            "modulo:productos",
            "modulo:ajustes",
            "modulo:proveedores",
            "modulo:ingresos",
            "reporte:kardex",
            "reporte:movimientos"
        ]

        role_permissions_map = {
            1: admin_permissions,
            2: vendedor_permissions,
            3: almacen_permissions
        }

        for rol_id, permissions in role_permissions_map.items():
            # Clear existing default permissions to avoid key conflicts or handle updates
            # (We only do this for the initial seed)
            conn.execute(text("DELETE FROM `roles_permisos` WHERE `rol_id` = :rol_id"), {"rol_id": rol_id})
            
            for perm in permissions:
                insert_perm = """
                INSERT INTO `roles_permisos` (`rol_id`, `permiso_key`)
                VALUES (:rol_id, :perm)
                """
                conn.execute(text(insert_perm), {"rol_id": rol_id, "perm": perm})
            print(f"Seeded {len(permissions)} permissions for role ID: {rol_id}.")

    print("Migration finished successfully.")

if __name__ == "__main__":
    main()
