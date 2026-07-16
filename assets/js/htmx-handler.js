(function () {
    "use strict";

    var keysToCleanup = [
        "editarUsuario", "eliminarUsuario", "cargarUsuarios",
        "editarRol", "eliminarRol", "verPermisos", "cargarRoles",
        "verDetalleDevolucion", "confirmarAnularDevolucion", "cargarDevoluciones", "validarYCalcularDevolucion",
        "cargarVentas", "verDetalleVenta", "quitarDetalleVenta", "cargarClientes", "cargarProductosVenta",
        "editarCategoria", "eliminarCategoria", "cargarCategorias",
        "editarCliente", "eliminarCliente", "editarProducto", "eliminarProducto", "cargarProductos",
        "editarProveedor", "eliminarProveedor", "cargarProveedores",
        "abrirCaja", "cerrarCaja", "verMovimientos", "cargarCajas",
        "cargarIngresos", "verDetalleIngreso", "quitarDetalleIngreso", "cargarProveedoresIngreso", "cargarProductosIngreso",
        "cargarAjustes", "procesarAjuste", "cargarProductosAjuste",
        "cargarKardex", "filtrarKardex", "cargarMovimientos",
        "editarComprobante", "eliminarComprobante", "cargarComprobantes"
    ];

    document.addEventListener("htmx:afterSettle", function(event) {
        var path = window.location.pathname;

        // 1. Limpieza de elementos del gráfico
        if (window.ApexCharts) {
            document.querySelectorAll(".apexcharts-canvas").forEach(el => el.remove());
        }

        // 2. Limpieza de scripts anteriores
        document.querySelectorAll('script[data-page]').forEach(el => el.remove());

        // 3. Limpieza sistemática de funciones obsoletas expuestas en window
        keysToCleanup.forEach(function (key) {
            if (typeof window[key] !== "undefined") {
                try {
                    delete window[key];
                } catch (e) {
                    window[key] = undefined;
                }
            }
        });

        // 4. Mapeo de rutas a scripts dinámicos
        var scripts = {
            "/": "/assets/js/pages/dashboard.js",
            "/dashboard": "/assets/js/pages/dashboard.js",
            "/users": "/assets/js/user.js",
            "/roles": "/assets/js/roles.js",
            "/devoluciones": "/assets/js/devoluciones.js",
            "/movimientos": "/assets/js/movimientos.js",
            "/categorias": "/assets/js/categoria.js",
            "/proveedores": "/assets/js/proveedor.js",
            "/productos": "/assets/js/producto.js",
            "/clientes": "/assets/js/cliente.js",
            "/caja": "/assets/js/caja.js",
            "/ingresos": "/assets/js/ingreso.js",
            "/ventas": "/assets/js/venta.js",
            "/kardex": "/assets/js/kardex.js",
            "/comprobantes": "/assets/js/comprobantes.js",
            "/ajustes": "/assets/js/ajuste.js"
        };

        var scriptSrc = scripts[path];
        if (scriptSrc) {
            if (scriptSrc.includes("dashboard.js") && !document.querySelector("#revenue-chart")) {
                return;
            }
            var script = document.createElement("script");
            script.setAttribute("data-page", "true");
            script.src = scriptSrc + "?t=" + Date.now();
            document.body.appendChild(script);
        }
    });

    // 5. Manejo centralizado de expiración de sesión
    document.addEventListener("htmx:responseError", function(event) {
        var xhr = event.detail.xhr;
        if (xhr.status === 401 || xhr.status === 403) {
            window.location.href = "/login";
        }
    });
})();
