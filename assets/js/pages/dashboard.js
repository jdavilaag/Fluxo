(function () {
    "use strict";

    async function initDashboard() {
        if (!document.getElementById("revenue-chart") && !document.getElementById("dash-ingresos")) {
            return;
        }
        try {
            const res = await fetch("/auth/dashboard/stats");
            if (!res.ok) {
                console.error("Error al cargar estadísticas del dashboard:", res.statusText);
                return;
            }
            const data = await res.json();

            // 1. Actualizar tarjetas principales
            const elClientes = document.getElementById("dash-clientes");
            if (elClientes) elClientes.textContent = data.clientes.toLocaleString();

            const elIngresos = document.getElementById("dash-ingresos");
            if (elIngresos) {
                elIngresos.textContent = "S/. " + data.ventas_total.toLocaleString("es-PE", { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                });
            }

            const elVentas = document.getElementById("dash-ventas");
            if (elVentas) elVentas.textContent = data.ventas_cantidad.toLocaleString();

            const elProductos = document.getElementById("dash-productos");
            if (elProductos) elProductos.textContent = data.productos.toLocaleString();

            // 2. Reporte de Ventas Semanales
            const categories = data.ventas_semana.map(item => item.dia);
            const revenueData = data.ventas_semana.map(item => item.total);
            const quantityData = data.ventas_semana.map(item => item.cantidad);

            const revenueChartEl = document.querySelector("#revenue-chart");
            if (revenueChartEl) {
                revenueChartEl.innerHTML = "";

                const colors = ["#3bc0c3", "#1a2942"];
                const options = {
                    series: [
                        { name: "Ingresos (S/.)", data: revenueData },
                        { name: "Cantidad Ventas", data: quantityData }
                    ],
                    chart: { 
                        height: 325, 
                        type: "bar", 
                        toolbar: { show: false } 
                    },
                    plotOptions: { 
                        bar: { columnWidth: "45%", borderRadius: 6 } 
                    },
                    stroke: { 
                        show: true, 
                        width: 2, 
                        colors: ["transparent"] 
                    },
                    dataLabels: { enabled: false },
                    colors: colors,
                    xaxis: { categories: categories },
                    yaxis: [
                        { title: { text: "Ingresos (S/.)" } },
                        { opposite: true, title: { text: "Cantidad de Ventas" } }
                    ],
                    legend: { offsetY: 7 },
                    grid: { padding: { bottom: 10 }, borderColor: "#f1f5f9" },
                    fill: { opacity: 1 },
                    tooltip: {
                        shared: true,
                        intersect: false
                    }
                };
                const chart = new ApexCharts(revenueChartEl, options);
                chart.render();
            }

            // Totales de la Semana y Variación Porcentual
            const elSemanaActual = document.getElementById("dash-semana-actual");
            if (elSemanaActual) elSemanaActual.textContent = "S/. " + data.semana_actual_total.toLocaleString("es-PE", { minimumFractionDigits: 2 });

            const elSemanaAnterior = document.getElementById("dash-semana-anterior");
            if (elSemanaAnterior) elSemanaAnterior.textContent = "S/. " + data.semana_anterior_total.toLocaleString("es-PE", { minimumFractionDigits: 2 });

            const elVariacion = document.getElementById("dash-semana-variacion");
            if (elVariacion) {
                const actual = data.semana_actual_total || 0;
                const anterior = data.semana_anterior_total || 0;
                if (anterior > 0) {
                    const diffPct = (((actual - anterior) / anterior) * 100).toFixed(1);
                    if (actual >= anterior) {
                        elVariacion.className = "badge bg-success-subtle text-success";
                        elVariacion.innerHTML = `<i class="ri-arrow-up-line me-1"></i>+${diffPct}% vs sem. ant.`;
                    } else {
                        elVariacion.className = "badge bg-danger-subtle text-danger";
                        elVariacion.innerHTML = `<i class="ri-arrow-down-line me-1"></i>${diffPct}% vs sem. ant.`;
                    }
                } else if (actual > 0) {
                    elVariacion.className = "badge bg-success-subtle text-success";
                    elVariacion.innerHTML = `<i class="ri-arrow-up-line me-1"></i>+100% esta semana`;
                } else {
                    elVariacion.className = "badge bg-light text-muted";
                    elVariacion.textContent = "Sin variación";
                }
            }

            const elTicketPromedio = document.getElementById("dash-ticket-promedio");
            if (elTicketPromedio) elTicketPromedio.textContent = "S/. " + data.ticket_promedio.toLocaleString("es-PE", { minimumFractionDigits: 2 });

            const elNuevosClientes = document.getElementById("dash-nuevos-clientes");
            if (elNuevosClientes) elNuevosClientes.textContent = data.nuevos_clientes.toLocaleString();

            // 3. Gráfico 2: Métodos de Pago (#us-share-chart)
            const shareChartEl = document.querySelector("#us-share-chart");
            if (shareChartEl) {
                shareChartEl.innerHTML = "";

                const labels = data.pagos_distribucion.map(item => item.metodo);
                const series = data.pagos_distribucion.map(item => item.total);

                if (series.length === 0) {
                    labels.push("Sin ventas");
                    series.push(1);
                } else {
                    const sorted = [...data.pagos_distribucion].sort((a, b) => b.total - a.total);
                    const topMethod = sorted[0];
                    const totalAll = sorted.reduce((sum, item) => sum + item.total, 0);
                    const pct = totalAll > 0 ? ((topMethod.total / totalAll) * 100).toFixed(1) : 0;
                    
                    const elPagoDestacado = document.getElementById("dash-pago-destacado");
                    if (elPagoDestacado) {
                        elPagoDestacado.textContent = `${pct}% ${topMethod.metodo}`;
                    }
                }

                const options = {
                    series: series,
                    chart: { 
                        width: 180, 
                        type: "donut" 
                    },
                    plotOptions: {
                        pie: {
                            donut: { size: "65%" }
                        }
                    },
                    legend: { show: false },
                    dataLabels: { enabled: false },
                    colors: ["#3bc0c3", "#6366f1", "#f13c6e", "#ffbc00", "#10b981"],
                    labels: labels
                };
                const chart = new ApexCharts(shareChartEl, options);
                chart.render();
            }

            // 4. Gráfico 3: Tendencia de Ingresos Mensuales (#yearly-sales-chart)
            const yearlyChartEl = document.querySelector("#yearly-sales-chart");
            if (yearlyChartEl) {
                yearlyChartEl.innerHTML = "";
                const monthsLabels = data.ventas_mensuales.map(item => item.label);
                const monthsData = data.ventas_mensuales.map(item => item.total);

                const options = {
                    series: [{
                        name: "Ingresos (S/.)",
                        data: monthsData
                    }],
                    chart: { 
                        height: 220, 
                        type: "area", 
                        toolbar: { show: false } 
                    },
                    colors: ["#6366f1"],
                    fill: {
                        type: "gradient",
                        gradient: {
                            shadeIntensity: 1,
                            opacityFrom: 0.35,
                            opacityTo: 0.05,
                            stops: [0, 90, 100]
                        }
                    },
                    dataLabels: { enabled: false },
                    stroke: { curve: "smooth", width: 3 },
                    markers: { size: 4 },
                    xaxis: { categories: monthsLabels },
                    legend: { show: false },
                    yaxis: { title: { text: "S/." } }
                };
                const chart = new ApexCharts(yearlyChartEl, options);
                chart.render();
            }

            // Totales Mensuales
            const elMesActual = document.getElementById("dash-mes-actual");
            if (elMesActual) elMesActual.textContent = "S/. " + data.mes_actual_total.toLocaleString("es-PE", { minimumFractionDigits: 2 });

            const elMesAnterior = document.getElementById("dash-mes-anterior");
            if (elMesAnterior) elMesAnterior.textContent = "S/. " + data.mes_anterior_total.toLocaleString("es-PE", { minimumFractionDigits: 2 });

            const elAcumuladoAnual = document.getElementById("dash-acumulado-anual");
            if (elAcumuladoAnual) elAcumuladoAnual.textContent = "S/. " + data.acumulado_anual_total.toLocaleString("es-PE", { minimumFractionDigits: 2 });

            // 5. Productos con Bajo Stock
            const elBajoStock = document.getElementById("dash-bajo-stock-lista");
            if (elBajoStock) {
                elBajoStock.innerHTML = "";
                if (data.productos_bajo_stock && data.productos_bajo_stock.length > 0) {
                    data.productos_bajo_stock.forEach(prod => {
                        const esAgotado = prod.stock_actual <= 0;
                        const badgeClass = esAgotado ? "bg-danger" : "bg-warning text-dark";
                        const labelEstado = esAgotado ? `Agotado (0 ${prod.unidad})` : `${prod.stock_actual} ${prod.unidad}`;

                        const li = document.createElement("li");
                        li.className = "list-group-item d-flex justify-content-between align-items-center py-2 px-3";
                        li.innerHTML = `
                            <div class="me-2 text-truncate" style="max-width: 60%;">
                                <div class="fw-semibold text-dark text-truncate">${prod.nombre}</div>
                                <small class="text-muted">Mínimo requerido: <strong>${prod.stock_minimo} ${prod.unidad}</strong></small>
                            </div>
                            <div class="d-flex align-items-center gap-2">
                                <span class="badge ${badgeClass}">${labelEstado}</span>
                                <a href="/ingresos" hx-get="/ingresos" hx-target="#main-content" hx-swap="innerHTML"
                                   class="btn btn-sm btn-soft-primary py-0 px-2" title="Registrar ingreso de mercadería">
                                    <i class="ri-add-line"></i>
                                </a>
                            </div>
                        `;
                        elBajoStock.appendChild(li);
                    });
                    if (window.htmx) window.htmx.process(elBajoStock);
                } else {
                    elBajoStock.innerHTML = `
                        <div class="text-center text-muted py-5">
                            <i class="ri-checkbox-circle-fill text-success fs-36 d-block mb-1"></i>
                            <span class="fw-medium text-dark d-block">Inventario saludable</span>
                            <small>Todos los productos superan su stock mínimo.</small>
                        </div>
                    `;
                }
            }

            // 6. Últimas Ventas
            const elVentasBody = document.getElementById("dash-recent-sales-body");
            if (elVentasBody) {
                elVentasBody.innerHTML = "";
                if (data.ultimas_ventas && data.ultimas_ventas.length > 0) {
                    data.ultimas_ventas.forEach(v => {
                        const tr = document.createElement("tr");
                        let badgeClass = "bg-success-subtle text-success";
                        const estadoL = v.estado.toLowerCase();
                        if (estadoL === "anulado") badgeClass = "bg-danger-subtle text-danger";
                        else if (estadoL === "pendiente") badgeClass = "bg-warning-subtle text-warning";
                        
                        tr.innerHTML = `
                            <td><span class="badge bg-light text-dark font-monospace fs-12">${v.nro_comprobante}</span></td>
                            <td class="text-muted fs-13">${v.fecha}</td>
                            <td class="text-truncate fw-medium text-dark" style="max-width: 170px;">${v.cliente}</td>
                            <td class="fw-bold text-dark">S/. ${v.total.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</td>
                            <td><span class="badge ${badgeClass}">${v.estado.toUpperCase()}</span></td>
                        `;
                        elVentasBody.appendChild(tr);
                    });
                } else {
                    elVentasBody.innerHTML = `
                        <tr>
                            <td colspan="5" class="text-center text-muted py-5">
                                <i class="ri-shopping-Initialize-line fs-28 d-block mb-1"></i>
                                No hay ventas registradas aún.
                            </td>
                        </tr>
                    `;
                }
            }

        } catch (err) {
            console.error("Error al inicializar dashboard dinámico:", err);
        }
    }

    initDashboard();
})();
