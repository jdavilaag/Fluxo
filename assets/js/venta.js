(function () {
  var todosClientes = [];
  var todosProductos = [];
  var detallesVenta = [];
  var todasVentas = [];
  var todasSeries = [];
  var paginaActual = 1;
  var porPagina = 8;
  var modalDetalleInstance = null;
  var pollingYapeInterval = null;
  var currentYapeToken = null;
  var modalYapeQRInstance = null;

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

  async function cargarClientes(seleccionarId) {
    try {
      const res = await fetch("/clientes/");
      todosClientes = await res.json();
      const select = document.getElementById("vta_cliente");
      const valorPrevio = seleccionarId || select.value;
      select.innerHTML = '<option value="">Seleccione un cliente</option>';
      todosClientes.filter(c => c.estado == 1).forEach(c => {
        select.innerHTML += `<option value="${c.id}" data-documento="${c.documento || ""}">${c.nombres} - ${c.documento}</option>`;
      });
      if (valorPrevio) {
        select.value = String(valorPrevio);
      }
    } catch { console.error("Error al cargar clientes"); }
  }

  async function cargarProductosVenta() {
    try {
      const res = await fetch("/productos/");
      todosProductos = await res.json();
      const select = document.getElementById("dtl_vta_producto");
      select.innerHTML = '<option value="">Seleccione un producto</option>';
      todosProductos.filter(p => p.estado == 1 && p.stock_actual > 0).forEach(p => {
        const codigoLabel = p.codigo_barras ? `[${p.codigo_barras}] ` : "";
        select.innerHTML += `<option value="${p.id}" data-precio="${p.precio_venta}" data-stock="${p.stock_actual}">${codigoLabel}${p.nombre_producto} (Stock: ${p.stock_actual})</option>`;
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
      (v.cliente_nombre || "").toLowerCase().includes(q) ||
      (v.nro_comprobante || "").toLowerCase().includes(q)
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
          <td class="fw-bold text-dark">S/ ${parseFloat(v.total).toFixed(2)}</td>
          <td><span class="badge bg-success-subtle text-success">${v.estado}</span></td>
          <td class="text-center">
            <button class="btn btn-sm btn-soft-info" onclick="verDetalleVenta(${v.id})" title="Ver detalle e imprimir">
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
      btn.onclick = () => { paginaActual = p; renderTablaVentas(todasVentas); };
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
    const filaIgv = document.getElementById("fila-igv");
    if (filaIgv) {
      filaIgv.style.setProperty("display", aplicarIgv ? "flex" : "none", "important");
    }

    calcularVuelto();
    return { subtotal, igv, total };
  }

  function calcularVuelto() {
    const total = parseFloat(document.getElementById("vta-total").textContent.replace("S/ ", "")) || 0;
    const montoPago = parseFloat(document.getElementById("vta_monto_pago").value) || 0;
    const vuelto = montoPago - total;
    document.getElementById("vta_vuelto").value = vuelto >= 0 ? vuelto.toFixed(2) : "0.00";
    document.getElementById("vta_vuelto").style.color = vuelto < 0 ? "#dc2626" : "#16a34a";
  }

  function round(num) {
    return Math.round(num * 100) / 100;
  }

  function renderDetallesVenta() {
    const tbody = document.getElementById("tabla-vta-detalle");
    if (detallesVenta.length === 0) {
      tbody.innerHTML = `
        <tr id="fila-vacia-vta">
          <td colspan="6" class="text-center py-5 text-muted">
            <i class="ri-shopping-cart-line fs-36 d-block mb-2 opacity-50"></i>
            El carrito está vacío. Seleccione o escanee un producto para comenzar.
          </td>
        </tr>`;
      calcularTotales();
      return;
    }

    tbody.innerHTML = detallesVenta.map((d, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>
          <span class="fw-semibold text-dark d-block">${d.nombre_producto}</span>
          <small class="text-muted">Stock máx: ${d.stock_max || "-"}</small>
        </td>
        <td class="text-center">
          <div class="qty-stepper mx-auto">
            <button type="button" onclick="cambiarCantidadDetalleVenta(${i}, -1)" title="Disminuir">-</button>
            <span>${d.cantidad}</span>
            <button type="button" onclick="cambiarCantidadDetalleVenta(${i}, 1)" title="Aumentar">+</button>
          </div>
        </td>
        <td class="text-end">S/ ${parseFloat(d.precio_venta).toFixed(2)}</td>
        <td class="text-end fw-bold text-dark">S/ ${parseFloat(d.subtotal).toFixed(2)}</td>
        <td class="text-center">
          <button class="btn btn-sm btn-soft-danger" onclick="quitarDetalleVenta(${i})" title="Quitar ítem">
            <i class="ri-delete-bin-line"></i>
          </button>
        </td>
      </tr>`).join("");

    calcularTotales();
  }

  function cambiarCantidadDetalleVenta(index, delta) {
    const item = detallesVenta[index];
    if (!item) return;
    const prod = todosProductos.find(p => p.id === item.producto_id);
    const maxStock = prod ? prod.stock_actual : (item.stock_max || 9999);
    const nuevaCantidad = item.cantidad + delta;

    if (nuevaCantidad <= 0) {
      quitarDetalleVenta(index);
      return;
    }
    if (nuevaCantidad > maxStock) {
      mostrarAlerta(`Stock insuficiente para ${item.nombre_producto}. Disponible: ${maxStock}`, "warning");
      return;
    }

    item.cantidad = nuevaCantidad;
    item.subtotal = round(nuevaCantidad * item.precio_venta);
    renderDetallesVenta();
  }

  function quitarDetalleVenta(index) {
    detallesVenta.splice(index, 1);
    renderDetallesVenta();
  }

  function agregarProductoAlCarrito(productoId, cantidadAgregar) {
    const prod = todosProductos.find(p => p.id === productoId);
    if (!prod) {
      mostrarAlerta("Producto no encontrado o sin stock disponible.", "danger");
      return false;
    }

    const stock = parseInt(prod.stock_actual) || 0;
    const precio = parseFloat(prod.precio_venta) || 0;
    const cantidad = parseInt(cantidadAgregar) || 1;

    if (cantidad <= 0) {
      mostrarAlerta("La cantidad debe ser mayor a 0.", "danger");
      return false;
    }
    if (cantidad > stock) {
      mostrarAlerta(`Stock insuficiente. Disponible: ${stock}`, "danger");
      return false;
    }

    const yaExiste = detallesVenta.findIndex(d => d.producto_id === productoId);
    if (yaExiste >= 0) {
      const nuevaCantidad = detallesVenta[yaExiste].cantidad + cantidad;
      if (nuevaCantidad > stock) {
        mostrarAlerta(`Stock insuficiente para ${prod.nombre_producto}. Disponible: ${stock}`, "danger");
        return false;
      }
      detallesVenta[yaExiste].cantidad = nuevaCantidad;
      detallesVenta[yaExiste].subtotal = round(nuevaCantidad * precio);
    } else {
      detallesVenta.push({
        producto_id: productoId,
        nombre_producto: prod.nombre_producto,
        cantidad: cantidad,
        precio_venta: precio,
        subtotal: round(cantidad * precio),
        stock_max: stock
      });
    }

    renderDetallesVenta();
    return true;
  }

  function imprimirTicketVenta(ventaId) {
    const vta = todasVentas.find(x => x.id === ventaId);
    if (!vta) {
      mostrarAlerta("No se encontró la información de la venta.", "danger");
      return;
    }

    fetch(`/ventas/${ventaId}/detalles`)
      .then(res => res.json())
      .then(detalles => {
        fetch(`/ventas/${ventaId}/pagos`)
          .then(resPagos => resPagos.json())
          .then(pagos => {
            const pago = pagos && pagos.length > 0 ? pagos[0] : null;
            const metodo = pago ? pago.metodo_pago : "EFECTIVO";
            const montoRecibido = pago ? pago.monto : vta.total;
            const vuelto = montoRecibido - vta.total;

            let itemsHtml = "";
            detalles.forEach(d => {
              const prod = todosProductos.find(p => p.id === d.producto_id);
              const name = prod ? prod.nombre_producto : `Prod ID ${d.producto_id}`;
              itemsHtml += `
                <tr>
                  <td style="text-align: left; padding: 2px 0;">${name}<br><small>${d.cantidad} x S/ ${parseFloat(d.precio_venta).toFixed(2)}</small></td>
                  <td style="text-align: right; vertical-align: bottom; padding: 2px 0;">S/ ${parseFloat(d.subtotal).toFixed(2)}</td>
                </tr>`;
            });

            const fechaFormat = new Date(vta.fecha_venta).toLocaleString("es-PE");

            const printContent = `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <title>Ticket - ${vta.nro_comprobante || 'Venta'}</title>
                <style>
                  @page {
                    size: 80mm auto;
                    margin: 0;
                  }
                  body {
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 11px;
                    width: 72mm;
                    margin: 0 auto;
                    padding: 10px 0;
                    color: #000;
                    line-height: 1.2;
                  }
                  .text-center { text-align: center; }
                  .text-right { text-align: right; }
                  .header { margin-bottom: 8px; }
                  .header h2 { margin: 0 0 3px 0; font-size: 14px; text-transform: uppercase; }
                  .header p { margin: 1px 0; font-size: 10px; }
                  .divider { border-top: 1px dashed #000; margin: 6px 0; }
                  .info-table, .items-table { width: 100%; border-collapse: collapse; }
                  .info-table td { padding: 1px 0; font-size: 10px; }
                  .items-table th { border-bottom: 1px dashed #000; padding: 2px 0; font-size: 10px; }
                  .totals-table { width: 100%; margin-top: 4px; }
                  .totals-table td { padding: 1px 0; font-size: 10px; }
                  .footer { margin-top: 12px; font-size: 9px; }
                </style>
              </head>
              <body>
                <div class="header text-center">
                  <h2>FLUXO SHOP</h2>
                  <p>R.U.C. 20123456789</p>
                  <p>Av. Larco 123, Miraflores, Lima</p>
                  <p>Teléfono: (01) 444-5555</p>
                </div>

                <div class="divider"></div>

                <div class="text-center" style="font-weight: bold; font-size: 12px;">
                  ${vta.tipo_comprobante || 'TICKET'}
                </div>
                <div class="text-center" style="font-weight: bold; font-size: 11px;">
                  Nro: ${vta.nro_comprobante || '000-00000000'}
                </div>

                <div class="divider"></div>

                <table class="info-table">
                  <tr>
                    <td>FECHA:</td>
                    <td class="text-right">${fechaFormat}</td>
                  </tr>
                  <tr>
                    <td>CLIENTE:</td>
                    <td class="text-right">${vta.cliente_nombre || 'PÚBLICO GENERAL'}</td>
                  </tr>
                  <tr>
                    <td>MÉTODO PAGO:</td>
                    <td class="text-right">${metodo}</td>
                  </tr>
                </table>

                <div class="divider"></div>

                <table class="items-table">
                  <thead>
                    <tr>
                      <th style="text-align: left;">DESCRIPCIÓN</th>
                      <th style="text-align: right;">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                </table>

                <div class="divider"></div>

                <table class="totals-table">
                  <tr>
                    <td>SUBTOTAL:</td>
                    <td class="text-right">S/ ${parseFloat(vta.subtotal).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>I.G.V. (18%):</td>
                    <td class="text-right">S/ ${parseFloat(vta.igv).toFixed(2)}</td>
                  </tr>
                  <tr style="font-weight: bold; font-size: 12px;">
                    <td>TOTAL:</td>
                    <td class="text-right">S/ ${parseFloat(vta.total).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colspan="2"><div class="divider"></div></td>
                  </tr>
                  <tr>
                    <td>EFECTIVO ENTREGADO:</td>
                    <td class="text-right">S/ ${parseFloat(montoRecibido).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>VUELTO:</td>
                    <td class="text-right">S/ ${vuelto >= 0 ? vuelto.toFixed(2) : '0.00'}</td>
                  </tr>
                </table>

                <div class="divider"></div>

                <div class="footer text-center">
                  <p>¡Gracias por su preferencia!</p>
                  <p>Desarrollado por FLUXO ERP</p>
                </div>

                <script>
                <\/script>
              </body>
              </html>
            `;

            let printIframe = document.getElementById("iframe-impresion-pos");
            if (!printIframe) {
              printIframe = document.createElement("iframe");
              printIframe.id = "iframe-impresion-pos";
              printIframe.style.position = "fixed";
              printIframe.style.right = "0";
              printIframe.style.bottom = "0";
              printIframe.style.width = "0";
              printIframe.style.height = "0";
              printIframe.style.border = "0";
              document.body.appendChild(printIframe);
            }
            const doc = printIframe.contentWindow.document;
            doc.open();
            doc.write(printContent);
            doc.close();
            setTimeout(() => {
              printIframe.contentWindow.focus();
              printIframe.contentWindow.print();
              limpiarBackdropsHuerfanos();
              const barcodeEl = document.getElementById("pos-barcode-input");
              if (barcodeEl) barcodeEl.focus();
            }, 250);
          })
          .catch(err => {
            console.error("Error al cargar pagos para impresión:", err);
            mostrarAlerta("Error al cargar datos del pago para impresión.", "danger");
          });
      })
      .catch(err => {
        console.error("Error al cargar detalles para impresión:", err);
        mostrarAlerta("Error al cargar detalles de la venta para impresión.", "danger");
      });
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

      try {
        const resPagos = await fetch(`/ventas/${ventaId}/pagos`);
        const pagos = await resPagos.json();
        const divPago = document.getElementById("seccion-detalle-pago");
        if (pagos && pagos.length > 0) {
          const p = pagos[0];
          document.getElementById("det-pago-metodo").textContent = p.metodo_pago;
          document.getElementById("det-pago-proveedor").textContent = p.proveedor_pago || "Ninguno / Por defecto";
          document.getElementById("det-pago-transaccion").textContent = p.id_transaccion_api || "Ninguno / Por defecto";
          
          const badgeEstado = document.getElementById("det-pago-estado");
          const estadoUpper = (p.estado_pago || "").toUpperCase();
          badgeEstado.textContent = estadoUpper;
          if (estadoUpper === "APROBADO" || estadoUpper === "COMPLETADO") {
            badgeEstado.className = "badge bg-success-subtle text-success fs-13";
          } else {
            badgeEstado.className = "badge bg-warning-subtle text-warning fs-13";
          }
          divPago.style.display = "flex";
        } else {
          document.getElementById("seccion-detalle-pago").style.display = "none";
        }
      } catch (err) {
        console.error("Error al cargar detalles de pago:", err);
        document.getElementById("seccion-detalle-pago").style.display = "none";
      }

      const vta = todasVentas.find(x => x.id === ventaId);
      const docTitle = vta && vta.nro_comprobante ? ` - ${vta.nro_comprobante}` : "";
      document.getElementById("modalDetalleVentaLabel").innerHTML = `<i class="ri-list-check me-2"></i>Detalle de Venta${docTitle}`;

      const btnImprimir = document.getElementById("btn-imprimir-ticket");
      if (btnImprimir) {
        btnImprimir.onclick = function () {
          imprimirTicketVenta(ventaId);
        };
      }

      const modalEl = document.getElementById("modalDetalleVenta");
      modalDetalleInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
      modalDetalleInstance.show();
    } catch {
      mostrarAlerta("Error al cargar detalle.", "danger");
    }
  }

  function sincronizarPillsMetodoPago(metodo) {
    document.querySelectorAll("#pos-payment-pills .payment-method-pill").forEach(pill => {
      if (pill.getAttribute("data-method") === metodo) {
        pill.classList.add("active");
      } else {
        pill.classList.remove("active");
      }
    });
  }

  function limpiarFormulario() {
    cancelarYape();
    document.getElementById("vta_cliente").value = "";
    document.getElementById("vta_metodo_pago").value = "EFECTIVO";
    sincronizarPillsMetodoPago("EFECTIVO");
    document.getElementById("vta_proveedor_pago").value = "OTRO";
    document.getElementById("vta_id_transaccion_api").value = "";
    document.getElementById("div-proveedor-pago").style.display = "none";
    document.getElementById("div-transaccion-pago").style.display = "none";
    document.getElementById("vta_igv").checked = false;
    document.getElementById("vta_tipo_comprobante").value = "BOLETA";
    actualizarSeriesVenta();
    document.getElementById("dtl_vta_producto").value = "";
    document.getElementById("dtl_vta_stock").value = "";
    document.getElementById("dtl_vta_cantidad").value = "";
    document.getElementById("dtl_vta_precio").value = "";
    document.getElementById("vta_monto_pago").value = "";
    document.getElementById("vta_vuelto").value = "";
    const barcodeInput = document.getElementById("pos-barcode-input");
    if (barcodeInput) barcodeInput.value = "";
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
    setTimeout(() => {
      const el = document.getElementById("mensaje-alerta");
      if (el) el.innerHTML = "";
    }, 8000);
  }

  // ── Yape QR Dinámico Lógica
  function abrirModalYapeQR() {
    const total = parseFloat(document.getElementById("vta-total").textContent.replace("S/ ", "")) || 0;
    if (total <= 0) {
      mostrarAlerta("Debe agregar productos al carrito antes de generar el QR de Yape.", "warning");
      document.getElementById("vta_metodo_pago").value = "EFECTIVO";
      sincronizarPillsMetodoPago("EFECTIVO");
      document.getElementById("vta_metodo_pago").dispatchEvent(new Event("change"));
      return;
    }

    document.getElementById("yape-pantalla-pendiente").style.display = "block";
    document.getElementById("yape-pantalla-exito").style.display = "none";
    document.getElementById("yape-monto-cobro").textContent = `S/ ${total.toFixed(2)}`;
    document.getElementById("yape-qr-img").src = "";

    const modalEl = document.getElementById("modalYapeQR");
    modalYapeQRInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
    modalYapeQRInstance.show();

    fetch(`/yape/crear-token?monto=${total}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.token) {
          currentYapeToken = data.token;
          const qrUrl = `/yape/qr/${data.token}?monto=${total}`;
          document.getElementById("yape-qr-img").src = qrUrl;

          iniciarPollingYape(data.token);
        } else {
          mostrarAlerta("Error al generar token de pago Yape.", "danger");
          modalYapeQRInstance.hide();
        }
      })
      .catch(err => {
        console.error(err);
        mostrarAlerta("Error de conexión al iniciar Yape.", "danger");
        modalYapeQRInstance.hide();
      });
  }

  function iniciarPollingYape(token) {
    if (pollingYapeInterval) clearInterval(pollingYapeInterval);

    pollingYapeInterval = setInterval(() => {
      fetch(`/yape/status/${token}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.pagado) {
            confirmarPagoYapeExitoso(data.codigo_referencia);
          }
        })
        .catch(err => console.error("Error polling Yape:", err));
    }, 2000);
  }

  function confirmarPagoYapeExitoso(ref) {
    if (pollingYapeInterval) clearInterval(pollingYapeInterval);
    pollingYapeInterval = null;

    document.getElementById("yape-pantalla-pendiente").style.display = "none";
    document.getElementById("yape-pantalla-exito").style.display = "block";
    document.getElementById("yape-ref-label").innerHTML = `<strong>Referencia:</strong> ${ref}`;

    document.getElementById("vta_proveedor_pago").value = "OTRO";
    document.getElementById("vta_id_transaccion_api").value = ref;
    const total = parseFloat(document.getElementById("vta-total").textContent.replace("S/ ", "")) || 0;
    document.getElementById("vta_monto_pago").value = total.toFixed(2);
    calcularVuelto();

    setTimeout(async () => {
      if (modalYapeQRInstance) {
        modalYapeQRInstance.hide();
      }
      limpiarBackdropsHuerfanos();
      setTimeout(async () => {
        await enviarRegistroVenta();
      }, 250);
    }, 1200);
  }

  function limpiarBackdropsHuerfanos() {
    setTimeout(() => {
      if (document.querySelectorAll(".modal.show").length === 0) {
        document.querySelectorAll(".modal-backdrop").forEach(el => el.remove());
        document.body.classList.remove("modal-open");
        document.body.style.removeProperty("overflow");
        document.body.style.removeProperty("padding-right");
      }
    }, 150);
  }

  function cancelarYape(revertirMetodo) {
    if (pollingYapeInterval) clearInterval(pollingYapeInterval);
    pollingYapeInterval = null;
    currentYapeToken = null;
    if (revertirMetodo) {
      const select = document.getElementById("vta_metodo_pago");
      const txnInput = document.getElementById("vta_id_transaccion_api");
      if (select && select.value === "YAPE" && (!txnInput || !txnInput.value.trim())) {
        select.value = "EFECTIVO";
        sincronizarPillsMetodoPago("EFECTIVO");
        const divProv = document.getElementById("div-proveedor-pago");
        const divTxn = document.getElementById("div-transaccion-pago");
        if (divProv) divProv.style.display = "none";
        if (divTxn) divTxn.style.display = "none";
      }
    }
    limpiarBackdropsHuerfanos();
  }

  // ── Eventos interactivos del POS
  const selectClienteVta = document.getElementById("vta_cliente");
  if (selectClienteVta) {
    selectClienteVta.onchange = function () {
      const opt = this.options[this.selectedIndex];
      const doc = (opt ? opt.getAttribute("data-documento") : "") || "";
      const selectComp = document.getElementById("vta_tipo_comprobante");
      if (!selectComp || !doc) return;
      if (doc.length === 11 && selectComp.value !== "FACTURA") {
        selectComp.value = "FACTURA";
        actualizarSeriesVenta();
      } else if (doc.length === 8 && selectComp.value === "FACTURA") {
        selectComp.value = "BOLETA";
        actualizarSeriesVenta();
      }
    };
  }

  // Modal de Nuevo Cliente Rápido en POS
  var modalNuevoCliPosInstance = null;
  const btnNuevoCliPos = document.getElementById("btn-nuevo-cliente-pos");
  if (btnNuevoCliPos) {
    btnNuevoCliPos.onclick = function () {
      ["pos_cli_documento", "pos_cli_email", "pos_cli_nombres", "pos_cli_telefono", "pos_cli_direccion"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });
      const modalEl = document.getElementById("modalNuevoClientePOS");
      modalNuevoCliPosInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
      modalNuevoCliPosInstance.show();
    };
  }

  async function autocompletarDocPosCli(docVal) {
    const doc = (docVal || "").trim();
    if (doc.length !== 8 && doc.length !== 11) return;
    const badge = document.getElementById("pos-cli-autofill-badge");
    if (badge) {
      badge.textContent = "Consultando...";
      badge.style.display = "inline-block";
    }
    try {
      const res = await fetch(`/auth/consultar-documento?numero=${encodeURIComponent(doc)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.encontrado) {
        if (data.nombre) document.getElementById("pos_cli_nombres").value = data.nombre;
        if (data.direccion) document.getElementById("pos_cli_direccion").value = data.direccion;
        if (data.telefono) document.getElementById("pos_cli_telefono").value = data.telefono;
        if (data.email) document.getElementById("pos_cli_email").value = data.email;
        if (badge) {
          badge.textContent = data.fuente === "SUNAT_RENIEC" ? `Obtenido de ${data.tipo}` : "Cliente encontrado";
          setTimeout(() => { badge.style.display = "none"; }, 3500);
        }
      } else if (badge) {
        badge.style.display = "none";
      }
    } catch {
      if (badge) badge.style.display = "none";
    }
  }

  const inpPosCliDoc = document.getElementById("pos_cli_documento");
  if (inpPosCliDoc) {
    inpPosCliDoc.addEventListener("input", function () {
      this.value = this.value.replace(/\D/g, "");
      if (this.value.length === 8 || this.value.length === 11) {
        autocompletarDocPosCli(this.value);
      }
    });
  }

  const btnPosBuscarDoc = document.getElementById("btn-pos-buscar-doc");
  if (btnPosBuscarDoc) {
    btnPosBuscarDoc.onclick = function () {
      autocompletarDocPosCli(document.getElementById("pos_cli_documento")?.value || "");
    };
  }

  const inpPosCliEmail = document.getElementById("pos_cli_email");
  if (inpPosCliEmail) {
    inpPosCliEmail.addEventListener("blur", async function () {
      const email = this.value.trim();
      if (!email || !email.includes("@")) return;
      try {
        const res = await fetch(`/auth/autocompletar-email?email=${encodeURIComponent(email)}`);
        if (!res.ok) return;
        const data = await res.json();
        const inpNom = document.getElementById("pos_cli_nombres");
        const inpDoc = document.getElementById("pos_cli_documento");
        const inpTel = document.getElementById("pos_cli_telefono");
        const inpDir = document.getElementById("pos_cli_direccion");
        if (data.encontrado) {
          if (data.nombre && !inpNom.value.trim()) inpNom.value = data.nombre;
          if (data.documento && !inpDoc.value.trim()) inpDoc.value = data.documento;
          if (data.telefono && !inpTel.value.trim()) inpTel.value = data.telefono;
          if (data.direccion && !inpDir.value.trim()) inpDir.value = data.direccion;
        } else if (data.nombre_sugerido && !inpNom.value.trim()) {
          inpNom.value = data.nombre_sugerido;
        }
      } catch {}
    });
  }

  const btnGuardarCliPos = document.getElementById("btn-guardar-cliente-pos");
  if (btnGuardarCliPos) {
    btnGuardarCliPos.onclick = async function () {
      const documento = document.getElementById("pos_cli_documento").value.trim();
      const nombres = document.getElementById("pos_cli_nombres").value.trim();
      const telefono = document.getElementById("pos_cli_telefono").value.trim();
      const email = document.getElementById("pos_cli_email").value.trim();
      const direccion = document.getElementById("pos_cli_direccion").value.trim();

      if (!documento || !nombres) {
        mostrarAlerta("DNI/RUC y Nombres son obligatorios.", "danger");
        return;
      }
      if (!/^\d{8,11}$/.test(documento)) {
        mostrarAlerta("El documento debe tener entre 8 y 11 dígitos.", "danger");
        return;
      }

      try {
        const res = await fetch("/clientes/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documento, nombres, telefono, email, direccion, estado: 1 })
        });
        const data = await res.json();
        if (res.ok) {
          if (modalNuevoCliPosInstance) modalNuevoCliPosInstance.hide();
          await cargarClientes(data.id);
          const selectCli = document.getElementById("vta_cliente");
          if (selectCli) selectCli.dispatchEvent(new Event("change"));
          mostrarAlerta(`Cliente "${nombres}" registrado y seleccionado.`, "success");
        } else {
          mostrarAlerta(data.detail || "Error al registrar cliente.", "danger");
        }
      } catch {
        mostrarAlerta("Error de conexión al registrar cliente.", "danger");
      }
    };
  }

  // Exportar Historial de Ventas a CSV
  const btnExportarVentasCsv = document.getElementById("btn-exportar-ventas-csv");
  if (btnExportarVentasCsv) {
    btnExportarVentasCsv.onclick = function () {
      if (!todasVentas || todasVentas.length === 0) {
        mostrarAlerta("No hay ventas para exportar.", "warning");
        return;
      }
      const q = (document.getElementById("buscador-vta")?.value || "").toLowerCase();
      const filtradas = todasVentas.filter(v =>
        (v.cliente_nombre || "").toLowerCase().includes(q) ||
        (v.nro_comprobante || "").toLowerCase().includes(q)
      );
      const headers = ["ID", "Comprobante", "Tipo", "Cliente", "Fecha", "Subtotal", "IGV", "Total", "Estado"];
      const rows = filtradas.map(v => [
        v.id,
        `"${(v.nro_comprobante || "").replace(/"/g, '""')}"`,
        v.tipo_comprobante || "",
        `"${(v.cliente_nombre || "").replace(/"/g, '""')}"`,
        `"${v.fecha_venta ? new Date(v.fecha_venta).toLocaleString("es-PE") : ""}"`,
        parseFloat(v.subtotal || 0).toFixed(2),
        parseFloat(v.igv || 0).toFixed(2),
        parseFloat(v.total || 0).toFixed(2),
        v.estado || ""
      ]);
      const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte_ventas_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };
  }

  const selectComprobante = document.getElementById("vta_tipo_comprobante");
  if (selectComprobante) {
    selectComprobante.onchange = function () {
      actualizarSeriesVenta();
    };
  }

  const selectMetodoPago = document.getElementById("vta_metodo_pago");
  if (selectMetodoPago) {
    selectMetodoPago.onchange = function () {
      const metodo = this.value;
      sincronizarPillsMetodoPago(metodo);
      const divProv = document.getElementById("div-proveedor-pago");
      const divTxn = document.getElementById("div-transaccion-pago");
      
      if (metodo === "EFECTIVO") {
        divProv.style.display = "none";
        divTxn.style.display = "none";
        document.getElementById("vta_proveedor_pago").value = "";
        document.getElementById("vta_id_transaccion_api").value = "";
      } else {
        divProv.style.display = "block";
        divTxn.style.display = "block";
        const total = parseFloat(document.getElementById("vta-total").textContent.replace("S/ ", "")) || 0;
        if (total > 0) {
          document.getElementById("vta_monto_pago").value = total.toFixed(2);
          calcularVuelto();
        }
        if (metodo === "YAPE") {
          abrirModalYapeQR();
        }
      }
    };
  }

  // Pills visuales de Método de Pago
  document.querySelectorAll("#pos-payment-pills .payment-method-pill").forEach(pill => {
    pill.onclick = function () {
      const metodo = this.getAttribute("data-method");
      const select = document.getElementById("vta_metodo_pago");
      if (select) {
        select.value = metodo;
        select.dispatchEvent(new Event("change"));
      }
    };
  });

  // Botones rápidos de denominación de efectivo (Exacto, S/ 10, S/ 20, S/ 50, S/ 100)
  document.querySelectorAll(".cash-quick-btn").forEach(btn => {
    btn.onclick = function () {
      const val = this.getAttribute("data-cash");
      const total = parseFloat(document.getElementById("vta-total").textContent.replace("S/ ", "")) || 0;
      const inputPago = document.getElementById("vta_monto_pago");
      if (!inputPago) return;

      if (val === "exacto") {
        inputPago.value = total > 0 ? total.toFixed(2) : "0.00";
      } else {
        inputPago.value = parseFloat(val).toFixed(2);
      }
      calcularVuelto();
    };
  });

  // Buscador rápido por Código de Barras o Nombre (Enter para agregar directo)
  const barcodeInput = document.getElementById("pos-barcode-input");
  if (barcodeInput) {
    barcodeInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        const term = this.value.trim().toLowerCase();
        if (!term) return;

        const disponibles = todosProductos.filter(p => p.estado == 1 && p.stock_actual > 0);
        // Prioridad 1: coincidencia exacta de código de barras
        let match = disponibles.find(p => p.codigo_barras && p.codigo_barras.toLowerCase() === term);
        // Prioridad 2: coincidencia parcial por nombre o código
        if (!match) {
          match = disponibles.find(p =>
            p.nombre_producto.toLowerCase().includes(term) ||
            (p.codigo_barras && p.codigo_barras.toLowerCase().includes(term))
          );
        }

        if (match) {
          if (agregarProductoAlCarrito(match.id, 1)) {
            this.value = "";
          }
        } else {
          mostrarAlerta(`No se encontró producto con stock para "${this.value}".`, "warning");
        }
      }
    });
  }

  const selectSerie = document.getElementById("vta_serie");
  if (selectSerie) {
    selectSerie.onchange = function () {
      cargarProximoCorrelativo();
    };
  }

  const selectProducto = document.getElementById("dtl_vta_producto");
  if (selectProducto) {
    selectProducto.onchange = function () {
      const opt = this.options[this.selectedIndex];
      const precio = opt.getAttribute("data-precio");
      const stock = opt.getAttribute("data-stock");
      document.getElementById("dtl_vta_precio").value = precio || "";
      document.getElementById("dtl_vta_stock").value = stock || "";
      const cantInput = document.getElementById("dtl_vta_cantidad");
      cantInput.max = stock || "";
      if (precio && !cantInput.value) {
        cantInput.value = 1;
      }
    };
  }

  const checkIgv = document.getElementById("vta_igv");
  if (checkIgv) {
    checkIgv.onchange = function () {
      calcularTotales();
    };
  }

  const inputMonto = document.getElementById("vta_monto_pago");
  if (inputMonto) {
    inputMonto.oninput = function () {
      calcularVuelto();
    };
  }

  const buscador = document.getElementById("buscador-vta");
  if (buscador) {
    buscador.oninput = function () {
      paginaActual = 1;
      renderTablaVentas(todasVentas);
    };
  }

  const btnAgregarVta = document.getElementById("btn-agregar-vta");
  if (btnAgregarVta) {
    btnAgregarVta.onclick = function () {
      const productoId = parseInt(document.getElementById("dtl_vta_producto").value);
      const cantidad = parseInt(document.getElementById("dtl_vta_cantidad").value);

      if (!productoId || !cantidad) {
        mostrarAlerta("Seleccione un producto e ingrese una cantidad válida.", "danger");
        return;
      }

      if (agregarProductoAlCarrito(productoId, cantidad)) {
        document.getElementById("dtl_vta_producto").value = "";
        document.getElementById("dtl_vta_stock").value = "";
        document.getElementById("dtl_vta_cantidad").value = "";
        document.getElementById("dtl_vta_precio").value = "";
      }
    };
  }

  async function enviarRegistroVenta() {
    const cliente_id = document.getElementById("vta_cliente").value;
    const metodo_pago = document.getElementById("vta_metodo_pago").value;
    const proveedor_pago = document.getElementById("vta_proveedor_pago").value;
    const id_transaccion_api = document.getElementById("vta_id_transaccion_api").value.trim();
    const aplicar_igv = document.getElementById("vta_igv").checked;
    const monto_pago = parseFloat(document.getElementById("vta_monto_pago").value);
    const total = parseFloat(document.getElementById("vta-total").textContent.replace("S/ ", ""));
    const tipo_comprobante = document.getElementById("vta_tipo_comprobante").value;
    const serie = document.getElementById("vta_serie").value;

    if (!cliente_id) {
      mostrarAlerta("Seleccione un cliente para el comprobante.", "danger"); return false;
    }
    if (!tipo_comprobante || !serie) {
      mostrarAlerta("Debe seleccionar tipo de comprobante y serie.", "danger"); return false;
    }
    if (tipo_comprobante === "FACTURA") {
      const cliObj = todosClientes.find(c => String(c.id) === String(cliente_id));
      if (cliObj && (!cliObj.documento || cliObj.documento.trim().length !== 11)) {
        mostrarAlerta("Para emitir FACTURA el cliente debe tener un RUC válido de 11 dígitos.", "warning");
        return false;
      }
    }
    if (detallesVenta.length === 0) {
      mostrarAlerta("Agregue al menos un producto al carrito.", "danger"); return false;
    }
    if (!monto_pago || monto_pago < total) {
      mostrarAlerta(`Monto recibido insuficiente. Total a cobrar: S/ ${total.toFixed(2)}`, "danger"); return false;
    }

    try {
      const res = await fetch("/ventas/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id: parseInt(cliente_id),
          metodo_pago,
          id_transaccion_api: metodo_pago === "EFECTIVO" ? null : (id_transaccion_api || null),
          proveedor_pago: metodo_pago === "EFECTIVO" ? null : (proveedor_pago || "OTRO"),
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
        const vueltoCalc = (monto_pago - total).toFixed(2);
        const nroComp = data && data.nro_comprobante ? ` (${data.nro_comprobante})` : "";
        const btnPrintHtml = data && data.id
          ? ` <button type="button" class="btn btn-sm btn-dark ms-2 py-0 px-2" onclick="imprimirTicketVenta(${data.id})"><i class="ri-printer-line me-1"></i>Reimprimir</button>`
          : "";
        limpiarFormulario();
        await cargarVentas();
        mostrarAlerta(`<strong>¡Venta registrada${nroComp}!</strong> Vuelto: S/ ${vueltoCalc}${btnPrintHtml}`, "success");
        if (data && data.id) {
          imprimirTicketVenta(data.id);
        }
        return true;
      } else {
        mostrarAlerta(data.detail || "Error al guardar la venta.", "danger");
        return false;
      }
    } catch {
      mostrarAlerta("Error de conexión al procesar la venta.", "danger");
      return false;
    }
  }

  const btnGuardarVenta = document.getElementById("btn-guardar-venta");
  if (btnGuardarVenta) {
    btnGuardarVenta.onclick = async function () {
      await enviarRegistroVenta();
    };
  }

  const btnLimpiarVenta = document.getElementById("btn-limpiar-venta");
  if (btnLimpiarVenta) {
    btnLimpiarVenta.onclick = function () {
      limpiarFormulario();
    };
  }

  const btnCerrarYape = document.getElementById("btn-cerrar-yape-modal");
  if (btnCerrarYape) {
    btnCerrarYape.onclick = function () {
      cancelarYape(true);
    };
  }

  const modalYapeEl = document.getElementById("modalYapeQR");
  if (modalYapeEl) {
    modalYapeEl.addEventListener("hidden.bs.modal", function () {
      cancelarYape(true);
    });
  }

  const btnSimularYape = document.getElementById("btn-yape-simular-pc");
  if (btnSimularYape) {
    btnSimularYape.onclick = function () {
      if (currentYapeToken) {
        fetch(`/yape/confirmar/${currentYapeToken}`, { method: "POST" })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              confirmarPagoYapeExitoso(data.codigo_referencia);
            }
          })
          .catch(err => console.error("Error confirming simulated Yape:", err));
      }
    };
  }

  window.cargarVentas = cargarVentas;
  window.verDetalleVenta = verDetalleVenta;
  window.imprimirTicketVenta = imprimirTicketVenta;
  window.quitarDetalleVenta = quitarDetalleVenta;
  window.cambiarCantidadDetalleVenta = cambiarCantidadDetalleVenta;
  window.cargarClientes = cargarClientes;
  window.cargarProductosVenta = cargarProductosVenta;

  iniciarVenta();
})();
