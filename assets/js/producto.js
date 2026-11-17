(function () {
  var todosProductos = [];
  var todasCategorias = [];
  var paginaActual = 1;
  var porPagina = 8;
  var modoEdicion = false;
  var productoEditandoId = null;
  var productoEliminarId = null;
  var modalEliminarInstance = null;
  var modalProductoInstance = null;

  function getModalInstance() {
    if (!modalProductoInstance) {
      modalProductoInstance = new bootstrap.Modal(document.getElementById("modalProducto"));
    }
    return modalProductoInstance;
  }

  async function cargarCategorias() {
    try {
      const res = await fetch("/categorias/");
      todasCategorias = await res.json();
      const select = document.getElementById("prod_categoria");
      select.innerHTML = '<option value="">Seleccione una categoría</option>';
      todasCategorias.filter(c => c.estado == 1).forEach(c => {
        select.innerHTML += `<option value="${c.id}">${c.nombre_categoria}</option>`;
      });
    } catch {
      console.error("Error al cargar categorías");
    }
  }

  async function cargarProductos() {
    try {
      const res = await fetch("/productos/");
      todosProductos = await res.json();
      document.getElementById("total-productos").textContent = todosProductos.length;

      let optimos = 0;
      let bajos = 0;
      let agotados = 0;
      todosProductos.forEach(p => {
        if (p.stock_actual <= 0) agotados++;
        else if (p.stock_actual <= p.stock_minimo) bajos++;
        else optimos++;
      });

      const elOpt = document.getElementById("kpi-prod-optimo");
      const elBajo = document.getElementById("kpi-prod-bajo");
      const elAgot = document.getElementById("kpi-prod-agotado");
      if (elOpt) elOpt.textContent = optimos;
      if (elBajo) elBajo.textContent = bajos;
      if (elAgot) elAgot.textContent = agotados;

      paginaActual = 1;
      renderTabla();
    } catch {
      document.getElementById("tabla-productos").innerHTML =
        `<tr><td colspan="11" class="text-center text-danger">Error al cargar productos.</td></tr>`;
    }
  }

  function getNombreCategoria(id) {
    const cat = todasCategorias.find(c => c.id === id);
    return cat ? cat.nombre_categoria : "-";
  }

  function productosFiltrados() {
    const q = document.getElementById("buscador-prod").value.toLowerCase();
    const estado = document.getElementById("filtro-estado-prod").value;
    const nivelStock = document.getElementById("filtro-nivel-stock-prod")?.value || "";
    return todosProductos.filter(p => {
      const coincide = p.nombre_producto.toLowerCase().includes(q) ||
        (p.codigo_barras && p.codigo_barras.toLowerCase().includes(q));
      const estadoOk = estado === "" || String(p.estado) === estado;
      let nivelOk = true;
      if (nivelStock === "AGOTADO") nivelOk = p.stock_actual <= 0;
      else if (nivelStock === "BAJO") nivelOk = p.stock_actual > 0 && p.stock_actual <= p.stock_minimo;
      else if (nivelStock === "OPTIMO") nivelOk = p.stock_actual > p.stock_minimo;
      return coincide && estadoOk && nivelOk;
    });
  }

  function renderTabla() {
    const filtrados = productosFiltrados();
    const total = filtrados.length;
    const totalPaginas = Math.ceil(total / porPagina);
    const inicio = (paginaActual - 1) * porPagina;
    const pagina = filtrados.slice(inicio, inicio + porPagina);

    document.getElementById("info-paginacion-prod").textContent =
      `Mostrando ${pagina.length} de ${total} productos`;

    const tbody = document.getElementById("tabla-productos");
    if (pagina.length === 0) {
      tbody.innerHTML = `<tr><td colspan="11" class="text-center py-4 text-muted">No se encontraron productos.</td></tr>`;
    } else {
      tbody.innerHTML = pagina.map((p, i) => `
        <tr>
          <td>${inicio + i + 1}</td>
          <td><i class="ri-box-3-line me-1 text-primary"></i><span class="fw-semibold text-dark">${p.nombre_producto}</span></td>
          <td><span class="badge bg-light text-secondary border">${getNombreCategoria(p.categoria_id)}</span></td>
          <td><code>${p.codigo_barras || "-"}</code></td>
          <td>S/ ${parseFloat(p.precio_compra).toFixed(2)}</td>
          <td class="fw-bold text-dark">S/ ${parseFloat(p.precio_venta).toFixed(2)}</td>
          <td>${p.stock_actual == 0
            ? `<span class="badge bg-danger-subtle text-danger px-2 py-1"><i class="ri-close-circle-fill me-1"></i>0 (Agotado)</span>`
            : p.stock_actual <= p.stock_minimo
            ? `<span class="badge bg-warning-subtle text-warning px-2 py-1"><i class="ri-alert-fill me-1"></i>${p.stock_actual} (Bajo)</span>`
            : `<span class="badge bg-success-subtle text-success px-2 py-1"><i class="ri-checkbox-circle-fill me-1"></i>${p.stock_actual} (Óptimo)</span>`}</td>
          <td class="text-muted">${p.stock_minimo ?? 0}</td>
          <td>${p.unidad_medida || "-"}</td>
          <td>${p.estado == 1
            ? '<span class="badge bg-success-subtle text-success">Activo</span>'
            : '<span class="badge bg-danger-subtle text-danger">Inactivo</span>'}</td>
          <td class="text-center d-flex gap-1 justify-content-center">
            <button class="btn btn-sm btn-soft-primary" onclick="editarProducto(${p.id})" title="Editar">
              <i class="ri-edit-line"></i>
            </button>
            <button class="btn btn-sm btn-soft-danger" onclick="eliminarProducto(${p.id})" title="Eliminar">
              <i class="ri-delete-bin-line"></i>
            </button>
          </td>
        </tr>`).join("");
    }

    const controles = document.getElementById("controles-paginacion-prod");
    controles.innerHTML = "";
    for (let p = 1; p <= totalPaginas; p++) {
      const btn = document.createElement("button");
      btn.className = `btn btn-sm ${p === paginaActual ? "btn-primary" : "btn-light"}`;
      btn.textContent = p;
      btn.onclick = () => { paginaActual = p; renderTabla(); };
      controles.appendChild(btn);
    }
  }

  function editarProducto(id) {
    const p = todosProductos.find(p => p.id === id);
    if (!p) return;

    modoEdicion = true;
    productoEditandoId = id;

    document.getElementById("prod_nombre").value = p.nombre_producto;
    document.getElementById("prod_categoria").value = p.categoria_id;
    document.getElementById("prod_codigo").value = p.codigo_barras || "";
    document.getElementById("prod_precio_compra").value = p.precio_compra;
    document.getElementById("prod_precio_venta").value = p.precio_venta;
    document.getElementById("prod_stock_minimo").value = p.stock_minimo;
    document.getElementById("prod_unidad").value = p.unidad_medida || "UND";
    document.getElementById("prod_vencimiento").checked = p.maneja_vencimiento == 1;
    document.getElementById("prod_estado").value = p.estado;

    document.getElementById("btn-registrar-prod").innerHTML = '<i class="ri-save-line me-1"></i> Actualizar Producto';
    document.getElementById("btn-registrar-prod").className = "btn btn-warning fw-semibold px-4";
    document.getElementById("modalProductoLabel").textContent = "Actualizar Producto";
    actualizarMargenProducto();

    getModalInstance().show();
  }

  function calcularEan13Checksum(doceDigitos) {
    let suma = 0;
    for (let i = 0; i < 12; i++) {
      const d = parseInt(doceDigitos[i], 10);
      suma += (i % 2 === 0) ? d : d * 3;
    }
    const resto = suma % 10;
    return resto === 0 ? 0 : 10 - resto;
  }

  function generarCodigoBarrasUnico() {
    for (let intento = 0; intento < 20; intento++) {
      let base = "775"; // Prefijo GS1 Perú
      for (let i = 0; i < 9; i++) {
        base += Math.floor(Math.random() * 10);
      }
      const codigo = base + calcularEan13Checksum(base);
      const existe = todosProductos.some(p => p.codigo_barras === codigo);
      if (!existe) return codigo;
    }
    return "775" + Date.now().toString().slice(-10);
  }

  function actualizarMargenProducto() {
    const box = document.getElementById("prod-margen-info");
    const txt = document.getElementById("prod-margen-texto");
    const badge = document.getElementById("prod-margen-badge");
    if (!box || !txt || !badge) return;

    const compra = parseFloat(document.getElementById("prod_precio_compra")?.value);
    const venta = parseFloat(document.getElementById("prod_precio_venta")?.value);

    if (isNaN(compra) || isNaN(venta) || (compra <= 0 && venta <= 0)) {
      box.style.setProperty("display", "none", "important");
      return;
    }

    box.style.setProperty("display", "flex", "important");
    const ganancia = venta - (compra || 0);
    const margenCosto = compra > 0 ? (ganancia / compra) * 100 : 100;

    if (ganancia <= 0) {
      box.className = "p-2 px-3 rounded-3 bg-danger-subtle border border-danger-subtle fs-13 d-flex justify-content-between align-items-center flex-wrap gap-2";
      txt.className = "fw-semibold text-danger";
      txt.innerHTML = `<i class="ri-error-warning-fill me-1"></i> Atencion: Precio de venta no genera utilidad (${ganancia >= 0 ? "S/ 0.00" : "- S/ " + Math.abs(ganancia).toFixed(2)})`;
      badge.className = "badge bg-danger";
      badge.textContent = `${margenCosto.toFixed(1)}%`;
    } else {
      box.className = "p-2 px-3 rounded-3 bg-success-subtle border border-success-subtle fs-13 d-flex justify-content-between align-items-center flex-wrap gap-2";
      txt.className = "fw-semibold text-success";
      txt.innerHTML = `<i class="ri-funds-box-line me-1"></i> Ganancia neta por unidad: <strong>S/ ${ganancia.toFixed(2)}</strong>`;
      badge.className = "badge bg-success";
      badge.textContent = `+${margenCosto.toFixed(1)}% rentabilidad`;
    }
  }

  function eliminarProducto(id) {
    productoEliminarId = id;
    const modalEl = document.getElementById("modalEliminarProd");
    modalEl.removeAttribute("aria-hidden");
    modalEliminarInstance = new bootstrap.Modal(modalEl);
    modalEliminarInstance.show();
  }

  function limpiarFormulario() {
    modoEdicion = false;
    productoEditandoId = null;
    document.getElementById("prod_nombre").value = "";
    document.getElementById("prod_categoria").value = "";
    document.getElementById("prod_codigo").value = "";
    document.getElementById("prod_precio_compra").value = "";
    document.getElementById("prod_precio_venta").value = "";
    document.getElementById("prod_stock_minimo").value = "0";
    document.getElementById("prod_unidad").value = "UND";
    document.getElementById("prod_vencimiento").checked = false;
    document.getElementById("prod_estado").value = "1";
    document.getElementById("btn-registrar-prod").innerHTML = '<i class="ri-save-line me-1"></i> Registrar Producto';
    document.getElementById("btn-registrar-prod").className = "btn btn-primary fw-semibold px-4";
    actualizarMargenProducto();
  }

  function mostrarAlerta(mensaje, tipo) {
    document.getElementById("mensaje-alerta").innerHTML = `
      <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>`;
    setTimeout(() => document.getElementById("mensaje-alerta").innerHTML = "", 5000);
  }

  const btnRegistrar = document.getElementById("btn-registrar-prod");
  if (btnRegistrar) {
    btnRegistrar.onclick = async function () {
      const nombre = document.getElementById("prod_nombre").value.trim();
      const categoria_id = document.getElementById("prod_categoria").value;
      const codigo_barras = document.getElementById("prod_codigo").value.trim();
      const precio_compra = parseFloat(document.getElementById("prod_precio_compra").value) || 0;
      const precio_venta = parseFloat(document.getElementById("prod_precio_venta").value) || 0;
      const stock_minimo = parseInt(document.getElementById("prod_stock_minimo").value) || 0;
      const unidad_medida = document.getElementById("prod_unidad").value;
      const maneja_vencimiento = document.getElementById("prod_vencimiento").checked ? 1 : 0;
      const estado = document.getElementById("prod_estado").value;

      if (!nombre || !categoria_id) {
        mostrarAlerta("Nombre y Categoría son obligatorios.", "danger"); return;
      }
      if (precio_venta <= 0) {
        mostrarAlerta("El precio de venta debe ser mayor a 0.", "danger"); return;
      }

      try {
        let res;
        const body = { nombre_producto: nombre, categoria_id: parseInt(categoria_id), codigo_barras, precio_compra, precio_venta, stock_minimo, unidad_medida, maneja_vencimiento, estado: parseInt(estado) };

        if (modoEdicion) {
          res = await fetch(`/productos/${productoEditandoId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
          });
        } else {
          res = await fetch("/productos/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
          });
        }

        const data = await res.json();
        if (res.ok) {
          mostrarAlerta(modoEdicion ? "Producto actualizado correctamente." : "Producto registrado correctamente.", "success");
          limpiarFormulario();
          cargarProductos();
          getModalInstance().hide();
        } else {
          mostrarAlerta(data.detail || "Error al guardar.", "danger");
        }
      } catch {
        mostrarAlerta("Error de conexión.", "danger");
      }
    };
  }

  const btnLimpiar = document.getElementById("btn-limpiar-prod");
  if (btnLimpiar) {
    btnLimpiar.onclick = function () {
      limpiarFormulario();
    };
  }

  const btnNuevo = document.getElementById("btn-nuevo-producto");
  if (btnNuevo) {
    btnNuevo.onclick = function () {
      limpiarFormulario();
      document.getElementById("modalProductoLabel").textContent = "Registrar Nuevo Producto";
      getModalInstance().show();
    };
  }

  const btnConfirmarEliminar = document.getElementById("btn-confirmar-eliminar-prod");
  if (btnConfirmarEliminar) {
    btnConfirmarEliminar.onclick = async function () {
      if (modalEliminarInstance) modalEliminarInstance.hide();
      try {
        const res = await fetch(`/productos/${productoEliminarId}`, { method: "DELETE" });
        if (res.ok) { mostrarAlerta("Producto eliminado correctamente.", "success"); cargarProductos(); }
        else mostrarAlerta("Error al eliminar.", "danger");
      } catch {
        mostrarAlerta("Error de conexión.", "danger");
      }
    };
  }

  const buscador = document.getElementById("buscador-prod");
  if (buscador) {
    buscador.oninput = function () {
      paginaActual = 1; renderTabla();
    };
  }

  const filtroEstado = document.getElementById("filtro-estado-prod");
  if (filtroEstado) {
    filtroEstado.onchange = function () {
      paginaActual = 1; renderTabla();
    };
  }

  const filtroNivelStock = document.getElementById("filtro-nivel-stock-prod");
  if (filtroNivelStock) {
    filtroNivelStock.onchange = function () {
      paginaActual = 1; renderTabla();
    };
  }

  const btnGenerarCod = document.getElementById("btn-generar-codigo-prod");
  if (btnGenerarCod) {
    btnGenerarCod.onclick = function () {
      const inp = document.getElementById("prod_codigo");
      if (inp) inp.value = generarCodigoBarrasUnico();
    };
  }

  const inpPrecioCompra = document.getElementById("prod_precio_compra");
  const inpPrecioVenta = document.getElementById("prod_precio_venta");
  if (inpPrecioCompra) inpPrecioCompra.addEventListener("input", actualizarMargenProducto);
  if (inpPrecioVenta) inpPrecioVenta.addEventListener("input", actualizarMargenProducto);

  window.editarProducto = editarProducto;
  window.eliminarProducto = eliminarProducto;
  window.cargarProductos = cargarProductos;

  cargarCategorias();
  cargarProductos();
})();