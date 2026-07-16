(function () {
    "use strict";

    async function initDashboard() {
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

            // 2. Gráfico 1: Ventas Semanales (#revenue-chart)
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
                        height: 377, 
                        type: "bar", 
                        toolbar: { show: false } 
                    },
                    plotOptions: { 
                        bar: { columnWidth: "50%" } 
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
                    grid: { padding: { bottom: 20 } },
                    fill: { opacity: 1 },
                    tooltip: {
                        shared: true,
                        intersect: false
                    }
                };
                const chart = new ApexCharts(revenueChartEl, options);
                chart.render();
            }

            // 3. Gráfico 2: Métodos de Pago (#us-share-chart)
            const shareChartEl = document.querySelector("#us-share-chart");
            if (shareChartEl) {
                shareChartEl.innerHTML = "";

                const labels = data.pagos_distribucion.map(item => item.metodo);
                const series = data.pagos_distribucion.map(item => item.total);

                if (series.length === 0) {
                    labels.push("Sin ventas");
                    series.push(0);
                }

                const options = {
                    series: series,
                    chart: { 
                        width: 220, 
                        type: "pie" 
                    },
                    legend: { show: true, position: "bottom" },
                    dataLabels: { enabled: false },
                    colors: ["#3bc0c3", "#1a2942", "#f13c6e", "#ffbc00", "#727cf5"],
                    labels: labels
                };
                const chart = new ApexCharts(shareChartEl, options);
                chart.render();
            }

            // 4. Gráfico 3: Tendencia de Ingresos (#yearly-sales-chart)
            const yearlyChartEl = document.querySelector("#yearly-sales-chart");
            if (yearlyChartEl) {
                yearlyChartEl.innerHTML = "";
                const options = {
                    series: [{
                        name: "Ingresos (S/.)",
                        data: revenueData
                    }],
                    chart: { 
                        height: 250, 
                        type: "line", 
                        toolbar: { show: false } 
                    },
                    colors: ["#727cf5"],
                    stroke: { curve: "smooth", width: [3] },
                    markers: { size: 3 },
                    xaxis: { categories: categories },
                    legend: { show: false }
                };
                const chart = new ApexCharts(yearlyChartEl, options);
                chart.render();
            }

        } catch (err) {
            console.error("Error al inicializar dashboard dinámico:", err);
        }
    }

    initDashboard();
})();
