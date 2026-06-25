document.addEventListener("htmx:afterSettle", function(event) {
    var path = window.location.pathname;

    if (window.ApexCharts) {
        document.querySelectorAll(".apexcharts-canvas").forEach(el => el.remove());
    }
    document.querySelectorAll('script[data-page]').forEach(el => el.remove());

    var scripts = {
        "/": "/assets/js/pages/dashboard.js",
        "/dashboard": "/assets/js/pages/dashboard.js",
        "/users": "/assets/js/user.js",
        "/categorias": "/assets/js/categoria.js",
        "/proveedores": "/assets/js/proveedor.js",
        "/productos": "/assets/js/producto.js",
        "/clientes": "/assets/js/cliente.js",
        "/caja": "/assets/js/caja.js",
        "/ingresos": "/assets/js/ingreso.js",
        "/ventas": "/assets/js/venta.js",
        "/kardex": "/assets/js/kardex.js",
        "/comprobantes": "/assets/js/comprobantes.js"
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


