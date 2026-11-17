(function () {
    "use strict";

    var keysToCleanup = [
        "editarUsuario", "eliminarUsuario", "cargarUsuarios",
        "editarRol", "eliminarRol", "verPermisos", "gestionarPermisos", "cargarRoles",
        "verDetalleDevolucion", "confirmarAnularDevolucion", "cargarDevoluciones", "validarYCalcularDevolucion",
        "cargarVentas", "verDetalleVenta", "imprimirTicketVenta", "quitarDetalleVenta", "cambiarCantidadDetalleVenta", "cargarClientes", "cargarProductosVenta",
        "editarCategoria", "eliminarCategoria", "cargarCategorias",
        "editarCliente", "eliminarCliente", "editarProducto", "eliminarProducto", "cargarProductos",
        "cargarDatosEtiquetas", "previsualizarEtiqueta", "generarYGuardarSku", "agregarAColaEtiquetas", "agregarAColaSegunStock", "cambiarCantidadColaEtq", "quitarDeColaEtq",
        "editarProveedor", "eliminarProveedor", "cargarProveedores",
        "iniciarCaja", "abrirCaja", "cerrarCaja", "verMovimientos", "cargarCajas",
        "iniciarIngreso", "cargarIngresos", "verDetalleIngreso", "quitarDetalleIngreso", "cargarProveedoresIngreso", "cargarProductosIngreso",
        "verDetalle", "quitarDetalle", "cambiarCantidadDetalleIngreso",
        "iniciarAjustes", "cargarAjustes", "procesarAjuste", "cargarProductosAjuste",
        "cargarKardex", "filtrarKardex", "cargarMovimientos",
        "editarComprobante", "eliminarComprobante", "cargarComprobantes"
    ];

    async function cargarAlertasStock() {
        var badgeEl = document.getElementById("noti-stock-badge");
        var resumenEl = document.getElementById("noti-stock-resumen");
        var listaEl = document.getElementById("noti-stock-lista");
        if (!badgeEl || !listaEl) return;

        try {
            var res = await originalFetch("/auth/alertas-stock");
            if (!res.ok) return;
            var data = await res.json();
            var total = data.total || 0;
            var items = data.items || [];

            if (total > 0) {
                badgeEl.textContent = total > 99 ? "99+" : total;
                badgeEl.style.display = "inline-block";
                badgeEl.className = data.agotados > 0
                    ? "noti-icon-badge badge text-bg-danger"
                    : "noti-icon-badge badge text-bg-warning";
            } else {
                badgeEl.textContent = "0";
                badgeEl.style.display = "none";
            }

            if (resumenEl) {
                resumenEl.textContent = total === 1 ? "1 producto" : total + " productos";
                resumenEl.className = total > 0
                    ? (data.agotados > 0 ? "badge bg-danger-subtle text-danger" : "badge bg-warning-subtle text-warning")
                    : "badge bg-success-subtle text-success";
            }

            if (items.length === 0) {
                listaEl.innerHTML =
                    '<div class="text-center text-muted py-4 px-3">' +
                        '<i class="ri-checkbox-circle-fill text-success fs-28 d-block mb-1"></i>' +
                        '<span class="fs-13">Todo el inventario supera el stock mínimo.</span>' +
                    '</div>';
                return;
            }

            listaEl.innerHTML = items.map(function (prod) {
                var esAgotado = prod.nivel === "AGOTADO" || prod.stock_actual <= 0;
                var iconBg = esAgotado ? "bg-danger-subtle text-danger" : "bg-warning-subtle text-warning";
                var iconClass = esAgotado ? "ri-close-circle-line" : "ri-alert-line";
                var estadoBadge = esAgotado
                    ? '<span class="badge bg-danger">Agotado: 0 ' + prod.unidad + '</span>'
                    : '<span class="badge bg-warning text-dark">Stock: ' + prod.stock_actual + ' ' + prod.unidad + '</span>';

                return (
                    '<a href="/ingresos" hx-get="/ingresos" hx-target="#main-content" hx-swap="innerHTML" class="dropdown-item notify-item py-2 border-bottom border-light">' +
                        '<div class="d-flex align-items-center">' +
                            '<div class="notify-icon ' + iconBg + ' d-flex align-items-center justify-content-center flex-shrink-0">' +
                                '<i class="' + iconClass + ' fs-18"></i>' +
                            '</div>' +
                            '<div class="flex-grow-1 text-truncate ms-2">' +
                                '<div class="d-flex justify-content-between align-items-center">' +
                                    '<span class="fw-semibold text-dark text-truncate fs-13" style="max-width: 145px;" title="' + prod.nombre + '">' + prod.nombre + '</span>' +
                                    estadoBadge +
                                '</div>' +
                                '<small class="text-muted d-block mt-1">Stock mínimo requerido: <strong>' + prod.stock_minimo + ' ' + prod.unidad + '</strong></small>' +
                            '</div>' +
                        '</div>' +
                    '</a>'
                );
            }).join("");

            if (window.htmx) {
                window.htmx.process(listaEl);
            }
        } catch (e) {
            console.error("Error al cargar alertas de stock:", e);
        }
    }

    // Interceptar peticiones mutadoras (POST, PUT, DELETE) para refrescar las alertas de stock automáticamente
    var originalFetch = window.fetch.bind(window);
    window.fetch = async function () {
        var response = await originalFetch.apply(this, arguments);
        try {
            var config = arguments[1] || {};
            var method = (config.method || "GET").toUpperCase();
            if (method === "POST" || method === "PUT" || method === "DELETE") {
                setTimeout(cargarAlertasStock, 300);
            }
        } catch (err) {
            // Ignorar errores de intercepción
        }
        return response;
    };

    var nombresModulos = {
        "/": "Escritorio Principal",
        "/escritorio": "Escritorio Principal",
        "/dashboard": "Dashboard Ejecutivo",
        "/ventas": "Terminal POS (Ventas)",
        "/caja": "Control y Arqueo de Caja",
        "/productos": "Catálogo de Productos",
        "/ingresos": "Compras y Abastecimiento",
        "/clientes": "Directorio de Clientes",
        "/proveedor": "Directorio de Proveedores",
        "/proveedores": "Directorio de Proveedores",
        "/devoluciones": "Devoluciones y Retornos",
        "/ajustes": "Ajustes de Stock",
        "/categorias": "Categorías",
        "/kardex": "Kardex Valorizado",
        "/movimientos": "Movimientos de Inventario",
        "/comprobantes": "Series y Correlativos",
        "/users": "Administración de Usuarios",
        "/roles": "Roles y Permisos",
        "/ayuda": "Centro de Ayuda"
    };

    function vincularFiltroEscritorio() {
        var inputFiltroEsc = document.getElementById("filtro-modulos-escritorio");
        if (inputFiltroEsc) {
            inputFiltroEsc.oninput = function () {
                var q = this.value.toLowerCase().trim();
                document.querySelectorAll("#grid-escritorio-principal .desktop-tile-item").forEach(function (tile) {
                    var kw = (tile.getAttribute("data-keywords") || "") + " " + tile.textContent.toLowerCase();
                    tile.style.display = (!q || kw.includes(q)) ? "" : "none";
                });
            };
        }
    }

    function actualizarMenuActivo(path) {
        var currentPath = path || window.location.pathname || "/dashboard";
        if (currentPath === "/") currentPath = "/dashboard";

        // Actualizar indicador de módulo activo en la barra superior
        var badgeModulo = document.getElementById("topbar-current-module");
        if (badgeModulo) {
            badgeModulo.textContent = nombresModulos[currentPath] || "Módulo Activo";
        }

        // Cerrar modal de App Launcher si estaba abierto
        var modalLauncherEl = document.getElementById("modalAppLauncher");
        if (modalLauncherEl && window.bootstrap) {
            var inst = bootstrap.Modal.getInstance(modalLauncherEl);
            if (inst) inst.hide();
        }

        vincularFiltroEscritorio();

        document.querySelectorAll(".side-nav .side-nav-link").forEach(function (link) {
            link.classList.remove("active-route");
        });

        var activeLink = document.querySelector('.side-nav a[hx-get="' + currentPath + '"]') ||
                         document.querySelector('.side-nav a[href="' + currentPath + '"]');
        if (activeLink) {
            var navLink = activeLink.classList.contains("side-nav-link")
                ? activeLink
                : activeLink.closest(".side-nav-item")?.querySelector(".side-nav-link");
            if (navLink) {
                navLink.classList.add("active-route");
            }
            activeLink.classList.add("active-route");
            var collapseParent = activeLink.closest(".collapse");
            if (collapseParent && !collapseParent.classList.contains("show")) {
                collapseParent.classList.add("show");
                var trigger = document.querySelector('[href="#' + collapseParent.id + '"]');
                if (trigger) trigger.setAttribute("aria-expanded", "true");
            }
        }
    }

    window.cargarAlertasStock = cargarAlertasStock;

    document.addEventListener("DOMContentLoaded", function () {
        cargarAlertasStock();
        actualizarMenuActivo(window.location.pathname);
        var btnNoti = document.getElementById("btn-noti-stock");
        if (btnNoti) {
            btnNoti.addEventListener("click", cargarAlertasStock);
        }

        // Buscador en vivo dentro del Modal Lanzador de Aplicaciones
        var buscadorLauncher = document.getElementById("buscador-app-launcher");
        if (buscadorLauncher) {
            buscadorLauncher.addEventListener("input", function () {
                var q = this.value.toLowerCase().trim();
                document.querySelectorAll("#grid-modal-launcher .app-launcher-link").forEach(function (tile) {
                    var kw = (tile.getAttribute("data-keywords") || "") + " " + tile.textContent.toLowerCase();
                    tile.style.display = (!q || kw.includes(q)) ? "" : "none";
                });
            });
        }

        var modalLauncherEl = document.getElementById("modalAppLauncher");
        if (modalLauncherEl) {
            modalLauncherEl.addEventListener("shown.bs.modal", function () {
                if (buscadorLauncher) {
                    buscadorLauncher.value = "";
                    buscadorLauncher.dispatchEvent(new Event("input"));
                    buscadorLauncher.focus();
                }
            });
        }

        // Botón para fijar/ocultar barra lateral clásica
        var btnPinSidebar = document.getElementById("btn-toggle-sidebar-pin");
        if (btnPinSidebar) {
            btnPinSidebar.addEventListener("click", function () {
                document.body.classList.toggle("sidebar-pinned");
            });
        }

        // Limpieza global de posibles fondos oscuros (modal-backdrop) huérfanos al cerrar cualquier modal
        document.addEventListener("hidden.bs.modal", function () {
            setTimeout(function () {
                if (document.querySelectorAll(".modal.show").length === 0) {
                    document.querySelectorAll(".modal-backdrop").forEach(function (el) { el.remove(); });
                    document.body.classList.remove("modal-open");
                    document.body.style.removeProperty("overflow");
                    document.body.style.removeProperty("padding-right");
                }
            }, 150);
        });

        // Atajos de teclado globales (F2: POS, F4: Productos, F8: Caja, F9: Aplicaciones)
        document.addEventListener("keydown", function (e) {
            if (e.key === "F2") {
                e.preventDefault();
                if (window.htmx) window.htmx.ajax("GET", "/ventas", "#main-content");
            } else if (e.key === "F4") {
                e.preventDefault();
                if (window.htmx) window.htmx.ajax("GET", "/productos", "#main-content");
            } else if (e.key === "F8") {
                e.preventDefault();
                if (window.htmx) window.htmx.ajax("GET", "/caja", "#main-content");
            } else if (e.key === "F9") {
                e.preventDefault();
                if (modalLauncherEl && window.bootstrap) {
                    var m = bootstrap.Modal.getOrCreateInstance(modalLauncherEl);
                    m.toggle();
                }
            }
        });
        if (document.getElementById("vista-etiquetas-qr")) {
            var sEtq = document.createElement("script");
            sEtq.setAttribute("data-page", "true");
            sEtq.src = "/assets/js/etiquetas.js?t=" + Date.now();
            document.body.appendChild(sEtq);
        }
    });

    document.addEventListener("htmx:afterSettle", function(event) {
        var reqPath = (event.detail && event.detail.pathInfo && event.detail.pathInfo.requestPath) || window.location.pathname;
        var path = reqPath.split("?")[0];
        if (reqPath.indexOf("modulo=etiquetas") !== -1) {
            path = "/etiquetas";
        }

        actualizarMenuActivo(path);

        // Actualizar campana de alertas de stock tras cada navegación
        cargarAlertasStock();

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
            "/proveedor": "/assets/js/proveedor.js",
            "/proveedores": "/assets/js/proveedor.js",
            "/productos": "/assets/js/producto.js",
            "/etiquetas": "/assets/js/etiquetas.js",
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
