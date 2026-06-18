(function () {
  var todasCategorias = [];
  var paginaActual = 1;
  var porPagina = 8;
  var modoEdicion = false;
  var categoriaEditandoId = null;
  var categoriaEliminarId = null;
  var modalEliminarInstance = null;

  // ── Cargar categorías ──
  async function cargarCategorias() {
    try {
      const res = await fetch("/categorias/");
      todasCategorias = await res.json();
      document.getElementById("total-categorias").textContent = todasCategorias.length;
      paginaActual = 1;
      renderTabla();
    } catch {
      document.getElementById("tabla-categorias").innerHTML =
        `<tr><td colspan="6" class="text-center text-danger">Error al cargar categorías.</td></tr>`;
    }
  }

  // ── Filtrar ──
  function categoriasFiltradas() {
    const q = document.getElementById("buscador-cat").value.toLowerCase();
    const estado = document.getElementById("filtro-estado-cat").value;
    return todasCategorias.filter(c => {
      const coincide = c.nombre_categoria.toLowerCase().includes(q);
      const estadoOk = estado === "" || String(c.estado) === estado;
      return coincide && estadoOk;
    });
  }

  // ── Renderizar tabla ──
  function renderTabla() {
    const filtradas = categoriasFiltradas();
    const total = filtradas.length;
    const totalPaginas = Math.ceil(total / porPagina);
    const inicio = (paginaActual - 1) * porPagina;
    const pagina = filtradas.slice(inicio, inicio + porPagina);

    document.getElementById("info-paginacion-cat").textContent =
      `Mostrando ${pagina.length} de ${total} categorías`;

    const tbody = document.getElementById("tabla-categorias");
    if (pagina.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No se encontraron categorías.</td></tr>`;
    } else {
      tbody.innerHTML = pagina.map((c, i) => `
        <tr>
          <td>${inicio + i + 1}</td>
          <td><i class="ri-price-tag-3-line me-1 text-muted"></i>${c.nombre_categoria}</td>
          <td>${c.descripcion || "-"}</td>
          <td>${c.estado == 1
            ? '<span class="badge bg-success-subtle text-success">Activo</span>'
            : '<span class="badge bg-danger-subtle text-danger">Inactivo</span>'}</td>
          <td>${c.creado_en ? new Date(c.creado_en).toLocaleDateString("es-PE") : "-"}</td>
          <td class="text-center d-flex gap-1 justify-content-center">
            <button class="btn btn-sm btn-soft-primary" onclick="editarCategoria(${c.id})" title="Editar">
              <i class="ri-edit-line"></i>
            </button>
            <button class="btn btn-sm btn-soft-danger" onclick="eliminarCategoria(${c.id})" title="Eliminar">
              <i class="ri-delete-bin-line"></i>
            </button>
          </td>
        </tr>`).join("");
    }

    const controles = document.getElementById("controles-paginacion-cat");
    controles.innerHTML = "";
    for (let p = 1; p <= totalPaginas; p++) {
      const btn = document.createElement("button");
      btn.className = `btn btn-sm ${p === paginaActual ? "btn-primary" : "btn-light"}`;
      btn.textContent = p;
      btn.onclick = () => { paginaActual = p; renderTabla(); };
      controles.appendChild(btn);
    }
  }

  // ── Editar ──
  function editarCategoria(id) {
    const c = todasCategorias.find(c => c.id === id);
    if (!c) return;

    modoEdicion = true;
    categoriaEditandoId = id;

    document.getElementById("cat_nombre").value = c.nombre_categoria;
    document.getElementById("cat_descripcion").value = c.descripcion || "";
    document.getElementById("cat_estado").value = c.estado;

    document.getElementById("btn-registrar-cat").innerHTML = '<i class="ri-save-line me-1"></i> Actualizar Categoría';
    document.getElementById("btn-registrar-cat").className = "btn btn-warning fw-semibold px-4";

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Eliminar ──
  function eliminarCategoria(id) {
    categoriaEliminarId = id;
    const modalEl = document.getElementById("modalEliminarCat");
    modalEl.removeAttribute("aria-hidden");
    modalEliminarInstance = new bootstrap.Modal(modalEl);
    modalEliminarInstance.show();
  }

  // ── Limpiar ──
  function limpiarFormulario() {
    modoEdicion = false;
    categoriaEditandoId = null;
    document.getElementById("cat_nombre").value = "";
    document.getElementById("cat_descripcion").value = "";
    document.getElementById("cat_estado").value = "1";
    document.getElementById("btn-registrar-cat").innerHTML = '<i class="ri-save-line me-1"></i> Registrar Categoría';
    document.getElementById("btn-registrar-cat").className = "btn btn-primary fw-semibold px-4";
  }

  // ── Alerta ──
  function mostrarAlerta(mensaje, tipo) {
    document.getElementById("mensaje-alerta").innerHTML = `
      <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>`;
    setTimeout(() => document.getElementById("mensaje-alerta").innerHTML = "", 5000);
  }

  // ── Eventos ──
  document.addEventListener("click", async function (e) {
    // Registrar o actualizar
    if (e.target && (e.target.id === "btn-registrar-cat" || e.target.closest("#btn-registrar-cat"))) {
      const nombre = document.getElementById("cat_nombre").value.trim();
      const descripcion = document.getElementById("cat_descripcion").value.trim();
      const estado = document.getElementById("cat_estado").value;

      if (!nombre) {
        mostrarAlerta("El nombre de la categoría es obligatorio.", "danger"); return;
      }

      try {
        let res;
        if (modoEdicion) {
          res = await fetch(`/categorias/${categoriaEditandoId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre_categoria: nombre, descripcion, estado: parseInt(estado) })
          });
        } else {
          res = await fetch("/categorias/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre_categoria: nombre, descripcion, estado: parseInt(estado) })
          });
        }

        const data = await res.json();
        if (res.ok) {
          mostrarAlerta(modoEdicion ? "Categoría actualizada correctamente." : "Categoría registrada correctamente.", "success");
          limpiarFormulario();
          cargarCategorias();
        } else {
          mostrarAlerta(data.detail || "Error al guardar.", "danger");
        }
      } catch {
        mostrarAlerta("Error de conexión.", "danger");
      }
    }

    // Limpiar
    if (e.target && (e.target.id === "btn-limpiar-cat" || e.target.closest("#btn-limpiar-cat"))) {
      limpiarFormulario();
    }

    // Confirmar eliminar
    if (e.target && e.target.id === "btn-confirmar-eliminar-cat") {
      if (modalEliminarInstance) modalEliminarInstance.hide();
      try {
        const res = await fetch(`/categorias/${categoriaEliminarId}`, { method: "DELETE" });
        if (res.ok) { mostrarAlerta("Categoría eliminada correctamente.", "success"); cargarCategorias(); }
        else mostrarAlerta("Error al eliminar.", "danger");
      } catch {
        mostrarAlerta("Error de conexión.", "danger");
      }
    }
  });

  document.addEventListener("input", function (e) {
    if (e.target && e.target.id === "buscador-cat") {
      paginaActual = 1; renderTabla();
    }
  });

  document.addEventListener("change", function (e) {
    if (e.target && e.target.id === "filtro-estado-cat") {
      paginaActual = 1; renderTabla();
    }
  });

  window.editarCategoria = editarCategoria;
  window.eliminarCategoria = eliminarCategoria;
  window.cargarCategorias = cargarCategorias;

  cargarCategorias();
})();