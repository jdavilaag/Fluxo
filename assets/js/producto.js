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
      paginaActual = 1;
      renderTabla();
    } catch {
      document.getElementById("tabla-productos").innerHTML =
        `<tr><td colspan="10" class="text-center text-danger">Error al cargar productos.</td></tr>`;
    }
  }

  function getNombreCategoria(id) {
    const cat = todasCategorias.find(c => c.id === id);
    return cat ? cat.nombre_categoria : "-";
  }

  function productosFiltrados() {
    const q = document.getElementById("buscador-prod").value.toLowerCase();
    const estado = document.getElementById("filtro-estado-prod").value;
    return todosProductos.filter(p => {
      const coincide = p.nombre_producto.toLowerCase().includes(q) ||
        (p.codigo_barras && p.codigo_barras.toLowerCase().includes(q));
      const estadoOk = estado === "" || String(p.estado) === estado;
      return coincide && estadoOk;
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
      tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-muted">No se encontraron productos.</td></tr>`;
    } else {
      tbody.innerHTML = pagina.map((p, i) => `
        <tr>
          <td>${inicio + i + 1}</td>
          <td><i class="ri-box-3-line me-1 text-muted"></i>${p.nombre_producto}</td>
          <td>${getNombreCategoria(p.categoria_id)}</td>
          <td>${p.codigo_barras || "-"}</td>
          <td>S/ ${parseFloat(p.precio_compra).toFixed(2)}</td>
          <td>S/ ${parseFloat(p.precio_venta).toFixed(2)}</td>
          <td>${p.stock_actual == 0
            ? `<span class="badge bg-danger-subtle text-danger">${p.stock_actual}</span>`
            : p.stock_actual <= p.stock_minimo
            ? `<span class="badge bg-warning-subtle text-warning">${p.stock_actual}</span>`
            : `<span class="badge bg-success-subtle text-success">${p.stock_actual}</span>`}</td>
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

    getModalInstance().show();
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

  window.editarProducto = editarProducto;
  window.eliminarProducto = eliminarProducto;
  window.cargarProductos = cargarProductos;

  cargarCategorias();
  cargarProductos();
})();