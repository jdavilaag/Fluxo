(function () {
  var todosIngresos = [];
  var todosProveedores = [];
  var todosProductos = [];
  var detalles = [];
  var paginaActual = 1;
  var porPagina = 8;
  var modalDetalleInstance = null;

  async function iniciarIngreso() {
    await cargarProveedores();
    await cargarProductos();
    await cargarIngresos();
    setFechaHoy();
  }

  function setFechaHoy() {
    const hoy = new Date().toISOString().split("T")[0];
    const el = document.getElementById("ing_fecha_compra");
    if (el) el.value = hoy;
  }

  async function cargarProveedores() {
    try {
      const res = await fetch("/proveedores/");
      todosProveedores = await res.json();
      const select = document.getElementById("ing_proveedor");
      select.innerHTML = '<option value="">Seleccione un proveedor</option>';
      todosProveedores.filter(p => p.estado == 1).forEach(p => {
        select.innerHTML += `<option value="${p.id}">${p.razon_social} (${p.ruc || "-"})</option>`;
      });
    } catch { console.error("Error al cargar proveedores"); }
  }

  async function cargarProductos() {
    try {
      const res = await fetch("/productos/");
      todosProductos = await res.json();
      const select = document.getElementById("dtl_producto");
      select.innerHTML = '<option value="">Seleccione un producto</option>';
      todosProductos.filter(p => p.estado == 1).forEach(p => {
        select.innerHTML += `<option value="${p.id}" data-precio="${p.precio_compra}" data-vencimiento="${p.maneja_vencimiento}">${p.nombre_producto} (Stock actual: ${p.stock_actual})</option>`;
      });
    } catch { console.error("Error al cargar productos"); }
  }

  async function cargarIngresos() {
    try {
      const res = await fetch("/ingresos/");
      todosIngresos = await res.json();
      document.getElementById("total-ingresos").textContent = todosIngresos.length;
      paginaActual = 1;
      renderTabla();
    } catch {
      document.getElementById("tabla-ingresos").innerHTML =
        `<tr><td colspan="7" class="text-center text-danger">Error al cargar ingresos.</td></tr>`;
    }
  }

  function ingresosFiltrados() {
    const q = document.getElementById("buscador-ing").value.toLowerCase();
    return todosIngresos.filter(i =>
      i.proveedor_nombre.toLowerCase().includes(q) ||
      (i.nro_comprobante && i.nro_comprobante.toLowerCase().includes(q))
    );
  }

  function renderTabla() {
    const filtrados = ingresosFiltrados();
    const total = filtrados.length;
    const totalPaginas = Math.ceil(total / porPagina);
    const inicio = (paginaActual - 1) * porPagina;
    const pagina = filtrados.slice(inicio, inicio + porPagina);

    document.getElementById("info-paginacion-ing").textContent =
      `Mostrando ${pagina.length} de ${total} ingresos`;

    const tbody = document.getElementById("tabla-ingresos");
    if (pagina.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No se encontraron ingresos.</td></tr>`;
    } else {
      tbody.innerHTML = pagina.map((ing, i) => `
        <tr>
          <td>${inicio + i + 1}</td>
          <td class="fw-semibold text-dark">${ing.proveedor_nombre}</td>
          <td><span class="badge bg-primary-subtle text-primary me-1">${ing.tipo_comprobante}</span>${ing.nro_comprobante || "-"}</td>
          <td>${ing.fecha_compra ? new Date(ing.fecha_compra).toLocaleDateString("es-PE") : "-"}</td>
          <td class="fw-bold text-dark">S/ ${parseFloat(ing.total).toFixed(2)}</td>
          <td><span class="badge bg-success-subtle text-success">${ing.estado}</span></td>
          <td class="text-center">
            <button class="btn btn-sm btn-soft-info" onclick="verDetalle(${ing.id})" title="Ver detalle">
              <i class="ri-eye-line"></i>
            </button>
          </td>
        </tr>`).join("");
    }

    const controles = document.getElementById("controles-paginacion-ing");
    controles.innerHTML = "";
    for (let p = 1; p <= totalPaginas; p++) {
      const btn = document.createElement("button");
      btn.className = `btn btn-sm ${p === paginaActual ? "btn-primary" : "btn-light"}`;
      btn.textContent = p;
      btn.onclick = () => { paginaActual = p; renderTabla(); };
      controles.appendChild(btn);
    }
  }

  function renderDetalles() {
    const tbody = document.getElementById("tabla-detalle");
    const badgeItems = document.getElementById("ing-items-badge");
    if (badgeItems) {
      badgeItems.textContent = `${detalles.length} ${detalles.length === 1 ? "ítem" : "ítems"}`;
    }

    if (detalles.length === 0) {
      tbody.innerHTML = `
        <tr id="fila-vacia">
          <td colspan="7" class="text-center py-5 text-muted">
            <i class="ri-inbox-unarchive-line fs-36 d-block mb-2 opacity-50"></i>
            No hay artículos en la orden de ingreso.
          </td>
        </tr>`;
      document.getElementById("total-ingreso").textContent = "S/ 0.00";
      return;
    }

    tbody.innerHTML = detalles.map((d, i) => `
      <tr>
        <td>${i + 1}</td>
        <td class="fw-semibold text-dark">${d.nombre_producto}</td>
        <td class="text-center">
          <div class="qty-stepper mx-auto">
            <button type="button" onclick="cambiarCantidadDetalleIngreso(${i}, -1)">-</button>
            <span>${d.cantidad}</span>
            <button type="button" onclick="cambiarCantidadDetalleIngreso(${i}, 1)">+</button>
          </div>
        </td>
        <td class="text-end">S/ ${parseFloat(d.precio_costo).toFixed(2)}</td>
        <td class="text-end fw-bold text-dark">S/ ${parseFloat(d.subtotal).toFixed(2)}</td>
        <td class="text-center">${d.fecha_vencimiento ? `<span class="badge bg-warning-subtle text-warning">${d.fecha_vencimiento}</span>` : "-"}</td>
        <td class="text-center">
          <button class="btn btn-sm btn-soft-danger" onclick="quitarDetalle(${i})">
            <i class="ri-delete-bin-line"></i>
          </button>
        </td>
      </tr>`).join("");

    const total = detalles.reduce((acc, d) => acc + d.subtotal, 0);
    document.getElementById("total-ingreso").textContent = `S/ ${total.toFixed(2)}`;
  }

  function cambiarCantidadDetalleIngreso(index, delta) {
    const item = detalles[index];
    if (!item) return;
    const nueva = item.cantidad + delta;
    if (nueva <= 0) {
      quitarDetalle(index);
      return;
    }
    item.cantidad = nueva;
    item.subtotal = Math.round(nueva * item.precio_costo * 100) / 100;
    renderDetalles();
  }

  function quitarDetalle(index) {
    detalles.splice(index, 1);
    renderDetalles();
  }

  async function verDetalle(ingresoId) {
    try {
      const res = await fetch(`/ingresos/${ingresoId}/detalles`);
      const detallesIngreso = await res.json();

      document.getElementById("tabla-modal-detalle").innerHTML = detallesIngreso.map((d, i) => {
        const prod = todosProductos.find(p => p.id === d.producto_id);
        return `
          <tr>
            <td>${i + 1}</td>
            <td class="fw-semibold">${prod ? prod.nombre_producto : d.producto_id}</td>
            <td>${d.cantidad}</td>
            <td>S/ ${parseFloat(d.precio_costo).toFixed(2)}</td>
            <td class="fw-bold">S/ ${parseFloat(d.subtotal).toFixed(2)}</td>
          </tr>`;
      }).join("");

      const modalEl = document.getElementById("modalDetalleIngreso");
      modalDetalleInstance = new bootstrap.Modal(modalEl);
      modalDetalleInstance.show();
    } catch {
      mostrarAlerta("Error al cargar detalle.", "danger");
    }
  }

  function limpiarFormulario() {
    document.getElementById("ing_proveedor").value = "";
    document.getElementById("ing_tipo_comprobante").value = "FACTURA";
    document.getElementById("ing_serie").value = "";
    document.getElementById("ing_numero").value = "";
    setFechaHoy();
    document.getElementById("dtl_producto").value = "";
    document.getElementById("dtl_cantidad").value = "";
    document.getElementById("dtl_precio").value = "";
    document.getElementById("dtl_vencimiento").value = "";
    document.getElementById("dtl_vencimiento").disabled = true;
    detalles = [];
    renderDetalles();
    cargarProveedores();
    cargarProductos();
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
    }, 5000);
  }

  const selectProducto = document.getElementById("dtl_producto");
  if (selectProducto) {
    selectProducto.onchange = function () {
      const opt = this.options[this.selectedIndex];
      const precio = opt.getAttribute("data-precio");
      if (precio) document.getElementById("dtl_precio").value = precio;

      const cantInput = document.getElementById("dtl_cantidad");
      if (precio && !cantInput.value) cantInput.value = 1;

      const vencimiento = opt.getAttribute("data-vencimiento");
      document.getElementById("dtl_vencimiento").disabled = vencimiento != "1";
      if (vencimiento != "1") document.getElementById("dtl_vencimiento").value = "";
    };
  }

  const ingSerie = document.getElementById("ing_serie");
  if (ingSerie) {
    ingSerie.oninput = function () {
      this.value = this.value.toUpperCase().trim();
    };
  }

  const ingNumero = document.getElementById("ing_numero");
  if (ingNumero) {
    ingNumero.onblur = function () {
      let val = this.value.trim();
      if (val && !isNaN(val)) {
        this.value = val.padStart(8, '0');
      }
    };
  }

  const buscador = document.getElementById("buscador-ing");
  if (buscador) {
    buscador.oninput = function () {
      paginaActual = 1; renderTabla();
    };
  }

  const btnAgregarDetalle = document.getElementById("btn-agregar-detalle");
  if (btnAgregarDetalle) {
    btnAgregarDetalle.onclick = function () {
      const productoId = parseInt(document.getElementById("dtl_producto").value);
      const cantidad = parseInt(document.getElementById("dtl_cantidad").value);
      const precio = parseFloat(document.getElementById("dtl_precio").value);
      const vencimiento = document.getElementById("dtl_vencimiento").value;

      if (!productoId || !cantidad || !precio) {
        mostrarAlerta("Seleccione producto, cantidad y precio de costo.", "danger"); return;
      }
      if (cantidad <= 0) {
        mostrarAlerta("La cantidad debe ser mayor a 0.", "danger"); return;
      }
      if (precio <= 0) {
        mostrarAlerta("El precio debe ser mayor a 0.", "danger"); return;
      }

      const prod = todosProductos.find(p => p.id === productoId);
      const yaExiste = detalles.findIndex(d => d.producto_id === productoId);

      if (yaExiste >= 0) {
        detalles[yaExiste].cantidad += cantidad;
        detalles[yaExiste].subtotal = detalles[yaExiste].cantidad * detalles[yaExiste].precio_costo;
      } else {
        detalles.push({
          producto_id: productoId,
          nombre_producto: prod ? prod.nombre_producto : "",
          cantidad: cantidad,
          precio_costo: precio,
          subtotal: cantidad * precio,
          fecha_vencimiento: vencimiento || null
        });
      }

      renderDetalles();
      document.getElementById("dtl_producto").value = "";
      document.getElementById("dtl_cantidad").value = "";
      document.getElementById("dtl_precio").value = "";
      document.getElementById("dtl_vencimiento").value = "";
    };
  }

  const btnGuardarIngreso = document.getElementById("btn-guardar-ingreso");
  if (btnGuardarIngreso) {
    btnGuardarIngreso.onclick = async function () {
      const proveedor_id = document.getElementById("ing_proveedor").value;
      const tipo_comprobante = document.getElementById("ing_tipo_comprobante").value;
      const serie = document.getElementById("ing_serie").value.trim();
      const numero = document.getElementById("ing_numero").value.trim();
      const fecha_compra = document.getElementById("ing_fecha_compra").value;

      if (!proveedor_id || !fecha_compra) {
        mostrarAlerta("Proveedor y fecha son obligatorios.", "danger"); return;
      }
      if (detalles.length === 0) {
        mostrarAlerta("Agregue al menos un producto.", "danger"); return;
      }

      try {
        const res = await fetch("/ingresos/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            proveedor_id: parseInt(proveedor_id),
            tipo_comprobante,
            serie,
            numero,
            fecha_compra: new Date(fecha_compra).toISOString(),
            detalles: detalles.map(d => ({
              producto_id: d.producto_id,
              cantidad: d.cantidad,
              precio_costo: d.precio_costo,
              fecha_vencimiento: d.fecha_vencimiento ? new Date(d.fecha_vencimiento).toISOString() : null
            }))
          })
        });

        const data = await res.json();
        if (res.ok) {
          mostrarAlerta("Ingreso de mercadería registrado correctamente.", "success");
          limpiarFormulario();
          cargarIngresos();
        } else {
          mostrarAlerta(data.detail || "Error al guardar.", "danger");
        }
      } catch {
        mostrarAlerta("Error de conexión.", "danger");
      }
    };
  }

  const btnLimpiarIngreso = document.getElementById("btn-limpiar-ingreso");
  if (btnLimpiarIngreso) {
    btnLimpiarIngreso.onclick = function () {
      limpiarFormulario();
    };
  }

  window.iniciarIngreso = iniciarIngreso;
  window.cargarIngresos = cargarIngresos;
  window.cargarProveedores = cargarProveedores;
  window.cargarProductos = cargarProductos;
  window.verDetalle = verDetalle;
  window.quitarDetalle = quitarDetalle;
  window.cambiarCantidadDetalleIngreso = cambiarCantidadDetalleIngreso;

  iniciarIngreso();
})();
