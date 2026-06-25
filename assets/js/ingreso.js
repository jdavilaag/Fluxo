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
    document.getElementById("ing_fecha_compra").value = hoy;
  }

  async function cargarProveedores() {
    try {
      const res = await fetch("/proveedores/");
      todosProveedores = await res.json();
      const select = document.getElementById("ing_proveedor");
      select.innerHTML = '<option value="">Seleccione un proveedor</option>';
      todosProveedores.filter(p => p.estado == 1).forEach(p => {
        select.innerHTML += `<option value="${p.id}">${p.razon_social}</option>`;
      });
    } catch { console.error("Error al cargar proveedores"); }
  }

async function cargarProductos() {
    try {
      const res = await fetch("/productos/");
      todosProductos = await res.json();
      //console.log("Productos cargados:", todosProductos);
      const select = document.getElementById("dtl_producto");
      select.innerHTML = '<option value="">Seleccione un producto</option>';
      todosProductos.filter(p => p.estado == 1).forEach(p => {  // ←  filtro
        select.innerHTML += `<option value="${p.id}" data-precio="${p.precio_compra}" data-vencimiento="${p.maneja_vencimiento}">${p.nombre_producto}</option>`;
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
          <td>${ing.proveedor_nombre}</td>
          <td>${ing.tipo_comprobante} ${ing.nro_comprobante || ""}</td>
          <td>${ing.fecha_compra ? new Date(ing.fecha_compra).toLocaleDateString("es-PE") : "-"}</td>
          <td>S/ ${parseFloat(ing.total).toFixed(2)}</td>
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
    if (detalles.length === 0) {
      tbody.innerHTML = `<tr id="fila-vacia"><td colspan="7" class="text-center py-3 text-muted">No hay productos agregados.</td></tr>`;
      document.getElementById("total-ingreso").textContent = "S/ 0.00";
      return;
    }

    tbody.innerHTML = detalles.map((d, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${d.nombre_producto}</td>
        <td>${d.cantidad}</td>
        <td>S/ ${parseFloat(d.precio_costo).toFixed(2)}</td>
        <td>S/ ${parseFloat(d.subtotal).toFixed(2)}</td>
        <td>${d.fecha_vencimiento || "-"}</td>
        <td class="text-center">
          <button class="btn btn-sm btn-soft-danger" onclick="quitarDetalle(${i})">
            <i class="ri-delete-bin-line"></i>
          </button>
        </td>
      </tr>`).join("");

    const total = detalles.reduce((acc, d) => acc + d.subtotal, 0);
    document.getElementById("total-ingreso").textContent = `S/ ${total.toFixed(2)}`;
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
            <td>${prod ? prod.nombre_producto : d.producto_id}</td>
            <td>${d.cantidad}</td>
            <td>S/ ${parseFloat(d.precio_costo).toFixed(2)}</td>
            <td>S/ ${parseFloat(d.subtotal).toFixed(2)}</td>
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
    detalles = [];
    renderDetalles();
    cargarProveedores();  // ← agrega esto
    cargarProductos();    // ← agrega esto
}

  function mostrarAlerta(mensaje, tipo) {
    document.getElementById("mensaje-alerta").innerHTML = `
      <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>`;
    setTimeout(() => document.getElementById("mensaje-alerta").innerHTML = "", 5000);
  }

  // Auto-llenar precio al seleccionar producto
  document.addEventListener("change", function (e) {
    if (e.target && e.target.id === "dtl_producto") {
      const opt = e.target.options[e.target.selectedIndex];
      const precio = opt.getAttribute("data-precio");
      if (precio) document.getElementById("dtl_precio").value = precio;

      const vencimiento = opt.getAttribute("data-vencimiento");
      document.getElementById("dtl_vencimiento").disabled = vencimiento != "1";
      if (vencimiento != "1") document.getElementById("dtl_vencimiento").value = "";
    }

    if (e.target && e.target.id === "buscador-ing") {
      paginaActual = 1; renderTabla();
    }
  });

  document.addEventListener("input", function (e) {
    if (e.target && e.target.id === "buscador-ing") {
      paginaActual = 1; renderTabla();
    }
  });

  document.addEventListener("click", async function (e) {
    // Agregar detalle
    if (e.target && (e.target.id === "btn-agregar-detalle" || e.target.closest("#btn-agregar-detalle"))) {
      const productoId = parseInt(document.getElementById("dtl_producto").value);
      const cantidad = parseInt(document.getElementById("dtl_cantidad").value);
      const precio = parseFloat(document.getElementById("dtl_precio").value);
      const vencimiento = document.getElementById("dtl_vencimiento").value;

      if (!productoId || !cantidad || !precio) {
        mostrarAlerta("Seleccione producto, cantidad y precio.", "danger"); return;
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
    }

    // Guardar ingreso
    if (e.target && (e.target.id === "btn-guardar-ingreso" || e.target.closest("#btn-guardar-ingreso"))) {
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
          mostrarAlerta("Ingreso registrado correctamente.", "success");
          limpiarFormulario();
          cargarIngresos();
        } else {
          mostrarAlerta(data.detail || "Error al guardar.", "danger");
        }
      } catch {
        mostrarAlerta("Error de conexión.", "danger");
      }
    }

    // Limpiar
    if (e.target && (e.target.id === "btn-limpiar-ingreso" || e.target.closest("#btn-limpiar-ingreso"))) {
      limpiarFormulario();
    }
  });

  window.cargarIngresos = cargarIngresos;
  window.verDetalle = verDetalle;
  window.quitarDetalle = quitarDetalle;

  iniciarIngreso();
})();