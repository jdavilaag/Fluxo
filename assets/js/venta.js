(function () {
  var todosClientes = [];
  var todosProductos = [];
  var detallesVenta = [];
  var todasVentas = [];
  var todasSeries = [];
  var paginaActual = 1;
  var porPagina = 8;
  var modalDetalleInstance = null;

  async function iniciarVenta() {
    await cargarClientes();
    await cargarProductosVenta();
    await cargarComprobantesVenta();
    await cargarVentas();
  }

  async function cargarComprobantesVenta() {
    try {
      const res = await fetch("/comprobante-series/?activos=true");
      todasSeries = await res.json();
      actualizarSeriesVenta();
    } catch {
      console.error("Error al cargar series de comprobantes");
    }
  }

  function actualizarSeriesVenta() {
    const tipo = document.getElementById("vta_tipo_comprobante").value;
    const selectSerie = document.getElementById("vta_serie");
    selectSerie.innerHTML = "";
    
    const filtradas = todasSeries.filter(s => s.tipo_comprobante === tipo);
    if (filtradas.length === 0) {
      selectSerie.innerHTML = '<option value="">No hay series activas</option>';
      document.getElementById("vta_numero").value = "00000000";
      return;
    }
    
    filtradas.forEach(s => {
      selectSerie.innerHTML += `<option value="${s.serie}">${s.serie}</option>`;
    });
    
    cargarProximoCorrelativo();
  }

  async function cargarProximoCorrelativo() {
    const tipo = document.getElementById("vta_tipo_comprobante").value;
    const serie = document.getElementById("vta_serie").value;
    if (!tipo || !serie) {
      document.getElementById("vta_numero").value = "00000000";
      return;
    }
    try {
      const res = await fetch(`/comprobante-series/next-number?tipo=${tipo}&serie=${serie}`);
      const data = await res.json();
      document.getElementById("vta_numero").value = data.next_number || "00000000";
    } catch {
      document.getElementById("vta_numero").value = "ERROR";
    }
  }

  async function cargarClientes() {
    try {
      const res = await fetch("/clientes/");
      todosClientes = await res.json();
      const select = document.getElementById("vta_cliente");
      select.innerHTML = '<option value="">Seleccione un cliente</option>';
      todosClientes.filter(c => c.estado == 1).forEach(c => {
        select.innerHTML += `<option value="${c.id}">${c.nombres} - ${c.documento}</option>`;
      });
    } catch { console.error("Error al cargar clientes"); }
  }

  async function cargarProductosVenta() {
    try {
      const res = await fetch("/productos/");
      todosProductos = await res.json();
      const select = document.getElementById("dtl_vta_producto");
      select.innerHTML = '<option value="">Seleccione un producto</option>';
      todosProductos.filter(p => p.estado == 1 && p.stock_actual > 0).forEach(p => {
        select.innerHTML += `<option value="${p.id}" data-precio="${p.precio_venta}" data-stock="${p.stock_actual}">${p.nombre_producto} (Stock: ${p.stock_actual})</option>`;
      });
    } catch { console.error("Error al cargar productos"); }
  }

  async function cargarVentas() {
    try {
      const res = await fetch("/ventas/");
      todasVentas = await res.json();
      document.getElementById("total-ventas").textContent = todasVentas.length;
      renderTablaVentas(todasVentas);
    } catch {
      document.getElementById("tabla-ventas").innerHTML =
        `<tr><td colspan="9" class="text-center text-danger">Error al cargar ventas.</td></tr>`;
    }
  }

  function renderTablaVentas(ventas) {
    const q = document.getElementById("buscador-vta").value.toLowerCase();
    const filtradas = ventas.filter(v =>
      v.cliente_nombre.toLowerCase().includes(q)
    );

    const total = filtradas.length;
    const totalPaginas = Math.ceil(total / porPagina);
    const inicio = (paginaActual - 1) * porPagina;
    const pagina = filtradas.slice(inicio, inicio + porPagina);

    document.getElementById("info-paginacion-vta").textContent =
      `Mostrando ${pagina.length} de ${total} ventas`;

    const tbody = document.getElementById("tabla-ventas");
    if (pagina.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">No se encontraron ventas.</td></tr>`;
    } else {
      tbody.innerHTML = pagina.map((v, i) => `
        <tr>
          <td>${inicio + i + 1}</td>
          <td><span class="fw-semibold">${v.nro_comprobante || "-"}</span></td>
          <td>${v.cliente_nombre}</td>
          <td>${v.fecha_venta ? new Date(v.fecha_venta).toLocaleString("es-PE") : "-"}</td>
          <td>S/ ${parseFloat(v.subtotal).toFixed(2)}</td>
          <td>S/ ${parseFloat(v.igv).toFixed(2)}</td>
          <td>S/ ${parseFloat(v.total).toFixed(2)}</td>
          <td><span class="badge bg-success-subtle text-success">${v.estado}</span></td>
          <td class="text-center">
            <button class="btn btn-sm btn-soft-info" onclick="verDetalleVenta(${v.id})" title="Ver detalle">
              <i class="ri-eye-line"></i>
            </button>
          </td>
        </tr>`).join("");
    }

    const controles = document.getElementById("controles-paginacion-vta");
    controles.innerHTML = "";
    for (let p = 1; p <= totalPaginas; p++) {
      const btn = document.createElement("button");
      btn.className = `btn btn-sm ${p === paginaActual ? "btn-primary" : "btn-light"}`;
      btn.textContent = p;
      btn.onclick = () => { paginaActual = p; cargarVentas(); };
      controles.appendChild(btn);
    }
  }

  function calcularTotales() {
    const subtotal = detallesVenta.reduce((acc, d) => acc + d.subtotal, 0);
    const aplicarIgv = document.getElementById("vta_igv").checked;
    const igv = aplicarIgv ? round(subtotal * 0.18) : 0;
    const total = round(subtotal + igv);

    document.getElementById("vta-subtotal").textContent = `S/ ${subtotal.toFixed(2)}`;
    document.getElementById("vta-igv").textContent = `S/ ${igv.toFixed(2)}`;
    document.getElementById("vta-total").textContent = `S/ ${total.toFixed(2)}`;
    document.getElementById("fila-igv").style.display = aplicarIgv ? "" : "none";

    calcularVuelto();
    return { subtotal, igv, total };
  }

  function calcularVuelto() {
    const total = parseFloat(document.getElementById("vta-total").textContent.replace("S/ ", "")) || 0;
    const montoPago = parseFloat(document.getElementById("vta_monto_pago").value) || 0;
    const vuelto = montoPago - total;
    document.getElementById("vta_vuelto").value = vuelto >= 0 ? vuelto.toFixed(2) : "0.00";
    document.getElementById("vta_vuelto").style.color = vuelto < 0 ? "red" : "";
  }

  function round(num) {
    return Math.round(num * 100) / 100;
  }

  function renderDetallesVenta() {
    const tbody = document.getElementById("tabla-vta-detalle");
    if (detallesVenta.length === 0) {
      tbody.innerHTML = `<tr id="fila-vacia-vta"><td colspan="6" class="text-center py-3 text-muted">No hay productos agregados.</td></tr>`;
      calcularTotales();
      return;
    }

    tbody.innerHTML = detallesVenta.map((d, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${d.nombre_producto}</td>
        <td>${d.cantidad}</td>
        <td>S/ ${parseFloat(d.precio_venta).toFixed(2)}</td>
        <td>S/ ${parseFloat(d.subtotal).toFixed(2)}</td>
        <td class="text-center">
          <button class="btn btn-sm btn-soft-danger" onclick="quitarDetalleVenta(${i})">
            <i class="ri-delete-bin-line"></i>
          </button>
        </td>
      </tr>`).join("");

    calcularTotales();
  }

  function quitarDetalleVenta(index) {
    detallesVenta.splice(index, 1);
    renderDetallesVenta();
  }

  async function verDetalleVenta(ventaId) {
    try {
      const res = await fetch(`/ventas/${ventaId}/detalles`);
      const detalles = await res.json();

      document.getElementById("tabla-modal-vta-detalle").innerHTML = detalles.map((d, i) => {
        const prod = todosProductos.find(p => p.id === d.producto_id);
        return `
          <tr>
            <td>${i + 1}</td>
            <td>${prod ? prod.nombre_producto : d.producto_id}</td>
            <td>${d.cantidad}</td>
            <td>S/ ${parseFloat(d.precio_venta).toFixed(2)}</td>
            <td>S/ ${parseFloat(d.subtotal).toFixed(2)}</td>
          </tr>`;
      }).join("");

      const vta = todasVentas.find(x => x.id === ventaId);
      const docTitle = vta && vta.nro_comprobante ? ` - ${vta.nro_comprobante}` : "";
      document.getElementById("modalDetalleVentaLabel").innerHTML = `<i class="ri-list-check me-2"></i>Detalle de Venta${docTitle}`;

      const modalEl = document.getElementById("modalDetalleVenta");
      modalDetalleInstance = new bootstrap.Modal(modalEl);
      modalDetalleInstance.show();
    } catch {
      mostrarAlerta("Error al cargar detalle.", "danger");
    }
  }

  function limpiarFormulario() {
    document.getElementById("vta_cliente").value = "";
    document.getElementById("vta_metodo_pago").value = "EFECTIVO";
    document.getElementById("vta_igv").checked = false;
    document.getElementById("vta_tipo_comprobante").value = "BOLETA";
    actualizarSeriesVenta();
    document.getElementById("dtl_vta_producto").value = "";
    document.getElementById("dtl_vta_stock").value = "";
    document.getElementById("dtl_vta_cantidad").value = "";
    document.getElementById("dtl_vta_precio").value = "";
    document.getElementById("vta_monto_pago").value = "";
    document.getElementById("vta_vuelto").value = "";
    detallesVenta = [];
    renderDetallesVenta();
    cargarClientes();
    cargarProductosVenta();
  }

  function mostrarAlerta(mensaje, tipo) {
    document.getElementById("mensaje-alerta").innerHTML = `
      <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>`;
    setTimeout(() => document.getElementById("mensaje-alerta").innerHTML = "", 5000);
  }

  // ── Eventos ──
  document.addEventListener("change", function (e) {
    if (e.target && e.target.id === "vta_tipo_comprobante") {
      actualizarSeriesVenta();
    }
    if (e.target && e.target.id === "vta_serie") {
      cargarProximoCorrelativo();
    }
    if (e.target && e.target.id === "dtl_vta_producto") {
      const opt = e.target.options[e.target.selectedIndex];
      const precio = opt.getAttribute("data-precio");
      const stock = opt.getAttribute("data-stock");
      document.getElementById("dtl_vta_precio").value = precio || "";
      document.getElementById("dtl_vta_stock").value = stock || "";
      document.getElementById("dtl_vta_cantidad").max = stock || "";
    }

    if (e.target && e.target.id === "vta_igv") {
      calcularTotales();
    }
  });

  document.addEventListener("input", function (e) {
    if (e.target && e.target.id === "vta_monto_pago") {
      calcularVuelto();
    }
    if (e.target && e.target.id === "buscador-vta") {
      paginaActual = 1; cargarVentas();
    }
  });

  document.addEventListener("click", async function (e) {
    // Agregar detalle
    if (e.target && (e.target.id === "btn-agregar-vta" || e.target.closest("#btn-agregar-vta"))) {
      const productoId = parseInt(document.getElementById("dtl_vta_producto").value);
      const cantidad = parseInt(document.getElementById("dtl_vta_cantidad").value);
      const precio = parseFloat(document.getElementById("dtl_vta_precio").value);
      const stock = parseInt(document.getElementById("dtl_vta_stock").value);

      if (!productoId || !cantidad || !precio) {
        mostrarAlerta("Seleccione producto y cantidad.", "danger"); return;
      }
      if (cantidad <= 0) {
        mostrarAlerta("La cantidad debe ser mayor a 0.", "danger"); return;
      }
      if (cantidad > stock) {
        mostrarAlerta(`Stock insuficiente. Disponible: ${stock}`, "danger"); return;
      }

      const prod = todosProductos.find(p => p.id === productoId);
      const yaExiste = detallesVenta.findIndex(d => d.producto_id === productoId);

      if (yaExiste >= 0) {
        const nuevaCantidad = detallesVenta[yaExiste].cantidad + cantidad;
        if (nuevaCantidad > stock) {
          mostrarAlerta(`Stock insuficiente. Disponible: ${stock}`, "danger"); return;
        }
        detallesVenta[yaExiste].cantidad = nuevaCantidad;
        detallesVenta[yaExiste].subtotal = nuevaCantidad * precio;
      } else {
        detallesVenta.push({
          producto_id: productoId,
          nombre_producto: prod ? prod.nombre_producto : "",
          cantidad,
          precio_venta: precio,
          subtotal: cantidad * precio
        });
      }

      renderDetallesVenta();
      document.getElementById("dtl_vta_producto").value = "";
      document.getElementById("dtl_vta_stock").value = "";
      document.getElementById("dtl_vta_cantidad").value = "";
      document.getElementById("dtl_vta_precio").value = "";
    }

    // Guardar venta
    if (e.target && (e.target.id === "btn-guardar-venta" || e.target.closest("#btn-guardar-venta"))) {
      const cliente_id = document.getElementById("vta_cliente").value;
      const metodo_pago = document.getElementById("vta_metodo_pago").value;
      const aplicar_igv = document.getElementById("vta_igv").checked;
      const monto_pago = parseFloat(document.getElementById("vta_monto_pago").value);
      const total = parseFloat(document.getElementById("vta-total").textContent.replace("S/ ", ""));
      const tipo_comprobante = document.getElementById("vta_tipo_comprobante").value;
      const serie = document.getElementById("vta_serie").value;

      if (!cliente_id) {
        mostrarAlerta("Seleccione un cliente.", "danger"); return;
      }
      if (!tipo_comprobante || !serie) {
        mostrarAlerta("Debe seleccionar tipo de comprobante y serie.", "danger"); return;
      }
      if (detallesVenta.length === 0) {
        mostrarAlerta("Agregue al menos un producto.", "danger"); return;
      }
      if (!monto_pago || monto_pago < total) {
        mostrarAlerta(`Monto insuficiente. Total: S/ ${total.toFixed(2)}`, "danger"); return;
      }

      try {
        const res = await fetch("/ventas/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cliente_id: parseInt(cliente_id),
            metodo_pago,
            aplicar_igv,
            monto_pago,
            tipo_comprobante,
            serie,
            detalles: detallesVenta.map(d => ({
              producto_id: d.producto_id,
              cantidad: d.cantidad,
              precio_venta: d.precio_venta
            }))
          })
        });

        const data = await res.json();
        if (res.ok) {
          mostrarAlerta(`Venta registrada. Vuelto: S/ ${(monto_pago - total).toFixed(2)}`, "success");
          limpiarFormulario();
          cargarVentas();
        } else {
          mostrarAlerta(data.detail || "Error al guardar.", "danger");
        }
      } catch {
        mostrarAlerta("Error de conexión.", "danger");
      }
    }

    // Limpiar
    if (e.target && (e.target.id === "btn-limpiar-venta" || e.target.closest("#btn-limpiar-venta"))) {
      limpiarFormulario();
    }
  });

  window.cargarVentas = cargarVentas;
  window.verDetalleVenta = verDetalleVenta;
  window.quitarDetalleVenta = quitarDetalleVenta;
  window.cargarClientes = cargarClientes;
  window.cargarProductosVenta = cargarProductosVenta;

  iniciarVenta();
})();