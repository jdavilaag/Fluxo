(function () {
  var todosProveedores = [];
  var paginaActual = 1;
  var porPagina = 8;
  var modoEdicion = false;
  var proveedorEditandoId = null;
  var proveedorEliminarId = null;
  var modalEliminarInstance = null;
  var modalProveedorInstance = null;

  function getModalInstance() {
    if (!modalProveedorInstance) {
      modalProveedorInstance = new bootstrap.Modal(document.getElementById("modalProveedor"));
    }
    return modalProveedorInstance;
  }

  async function cargarProveedores() {
    try {
      const res = await fetch("/proveedores/");
      todosProveedores = await res.json();
      document.getElementById("total-proveedores").textContent = todosProveedores.length;
      paginaActual = 1;
      renderTabla();
    } catch {
      document.getElementById("tabla-proveedores").innerHTML =
        `<tr><td colspan="8" class="text-center text-danger">Error al cargar proveedores.</td></tr>`;
    }
  }

  function proveedoresFiltrados() {
    const q = document.getElementById("buscador-prov").value.toLowerCase();
    const estado = document.getElementById("filtro-estado-prov").value;
    return todosProveedores.filter(p => {
      const coincide = p.razon_social.toLowerCase().includes(q) || p.ruc.includes(q);
      const estadoOk = estado === "" || String(p.estado) === estado;
      return coincide && estadoOk;
    });
  }

  function renderTabla() {
    const filtrados = proveedoresFiltrados();
    const total = filtrados.length;
    const totalPaginas = Math.ceil(total / porPagina);
    const inicio = (paginaActual - 1) * porPagina;
    const pagina = filtrados.slice(inicio, inicio + porPagina);

    document.getElementById("info-paginacion-prov").textContent =
      `Mostrando ${pagina.length} de ${total} proveedores`;

    const tbody = document.getElementById("tabla-proveedores");
    if (pagina.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No se encontraron proveedores.</td></tr>`;
    } else {
      tbody.innerHTML = pagina.map((p, i) => `
        <tr>
          <td>${inicio + i + 1}</td>
          <td><i class="ri-truck-line me-1 text-muted"></i>${p.ruc}</td>
          <td>${p.razon_social}</td>
          <td>${p.telefono || "-"}</td>
          <td>${p.email || "-"}</td>
          <td>${p.estado == 1
            ? '<span class="badge bg-success-subtle text-success">Activo</span>'
            : '<span class="badge bg-danger-subtle text-danger">Inactivo</span>'}</td>
          <td>${p.creado_en ? new Date(p.creado_en).toLocaleDateString("es-PE") : "-"}</td>
          <td class="text-center d-flex gap-1 justify-content-center">
            <button class="btn btn-sm btn-soft-primary" onclick="editarProveedor(${p.id})" title="Editar">
              <i class="ri-edit-line"></i>
            </button>
            <button class="btn btn-sm btn-soft-danger" onclick="eliminarProveedor(${p.id})" title="Eliminar">
              <i class="ri-delete-bin-line"></i>
            </button>
          </td>
        </tr>`).join("");
    }

    const controles = document.getElementById("controles-paginacion-prov");
    controles.innerHTML = "";
    for (let p = 1; p <= totalPaginas; p++) {
      const btn = document.createElement("button");
      btn.className = `btn btn-sm ${p === paginaActual ? "btn-primary" : "btn-light"}`;
      btn.textContent = p;
      btn.onclick = () => { paginaActual = p; renderTabla(); };
      controles.appendChild(btn);
    }
  }

  function editarProveedor(id) {
    const p = todosProveedores.find(p => p.id === id);
    if (!p) return;

    modoEdicion = true;
    proveedorEditandoId = id;

    document.getElementById("prov_ruc").value = p.ruc;
    document.getElementById("prov_razon_social").value = p.razon_social;
    document.getElementById("prov_telefono").value = p.telefono || "";
    document.getElementById("prov_email").value = p.email || "";
    document.getElementById("prov_direccion").value = p.direccion || "";
    document.getElementById("prov_estado").value = p.estado;

    document.getElementById("btn-registrar-prov").innerHTML = '<i class="ri-save-line me-1"></i> Actualizar Proveedor';
    document.getElementById("btn-registrar-prov").className = "btn btn-warning fw-semibold px-4";
    document.getElementById("modalProveedorLabel").textContent = "Actualizar Proveedor";

    getModalInstance().show();
  }

  function eliminarProveedor(id) {
    proveedorEliminarId = id;
    const modalEl = document.getElementById("modalEliminarProv");
    modalEl.removeAttribute("aria-hidden");
    modalEliminarInstance = new bootstrap.Modal(modalEl);
    modalEliminarInstance.show();
  }

  function limpiarFormulario() {
    modoEdicion = false;
    proveedorEditandoId = null;
    document.getElementById("prov_ruc").value = "";
    document.getElementById("prov_razon_social").value = "";
    document.getElementById("prov_telefono").value = "";
    document.getElementById("prov_email").value = "";
    document.getElementById("prov_direccion").value = "";
    document.getElementById("prov_estado").value = "1";
    document.getElementById("btn-registrar-prov").innerHTML = '<i class="ri-save-line me-1"></i> Registrar Proveedor';
    document.getElementById("btn-registrar-prov").className = "btn btn-primary fw-semibold px-4";
    document.getElementById("modalProveedorLabel").textContent = "Registrar Nuevo Proveedor";
  }

  function mostrarAlerta(mensaje, tipo) {
    document.getElementById("mensaje-alerta").innerHTML = `
      <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>`;
    setTimeout(() => document.getElementById("mensaje-alerta").innerHTML = "", 5000);
  }

  document.addEventListener("click", async function (e) {
    if (e.target && (e.target.id === "btn-registrar-prov" || e.target.closest("#btn-registrar-prov"))) {
      const ruc = document.getElementById("prov_ruc").value.trim();
      const razon_social = document.getElementById("prov_razon_social").value.trim();
      const telefono = document.getElementById("prov_telefono").value.trim();
      const email = document.getElementById("prov_email").value.trim();
      const direccion = document.getElementById("prov_direccion").value.trim();
      const estado = document.getElementById("prov_estado").value;

      if (!ruc || !razon_social) {
        mostrarAlerta("RUC y Razón Social son obligatorios.", "danger"); return;
      }
      if (!/^\d{11}$/.test(ruc)) {
        mostrarAlerta("El RUC debe tener 11 dígitos.", "danger"); return;
      }

      try {
        let res;
        if (modoEdicion) {
          res = await fetch(`/proveedores/${proveedorEditandoId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ruc, razon_social, telefono, email, direccion, estado: parseInt(estado) })
          });
        } else {
          res = await fetch("/proveedores/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ruc, razon_social, telefono, email, direccion, estado: parseInt(estado) })
          });
        }

        const data = await res.json();
        if (res.ok) {
          mostrarAlerta(modoEdicion ? "Proveedor actualizado correctamente." : "Proveedor registrado correctamente.", "success");
          limpiarFormulario();
          cargarProveedores();
          getModalInstance().hide();
        } else {
          mostrarAlerta(data.detail || "Error al guardar.", "danger");
        }
      } catch {
        mostrarAlerta("Error de conexión.", "danger");
      }
    }

    if (e.target && (e.target.id === "btn-nuevo-proveedor" || e.target.closest("#btn-nuevo-proveedor"))) {
      limpiarFormulario();
      getModalInstance().show();
    }

    if (e.target && (e.target.id === "btn-limpiar-prov" || e.target.closest("#btn-limpiar-prov"))) {
      limpiarFormulario();
    }

    if (e.target && e.target.id === "btn-confirmar-eliminar-prov") {
      if (modalEliminarInstance) modalEliminarInstance.hide();
      try {
        const res = await fetch(`/proveedores/${proveedorEliminarId}`, { method: "DELETE" });
        if (res.ok) { mostrarAlerta("Proveedor eliminado correctamente.", "success"); cargarProveedores(); }
        else mostrarAlerta("Error al eliminar.", "danger");
      } catch {
        mostrarAlerta("Error de conexión.", "danger");
      }
    }
  });

  document.addEventListener("input", function (e) {
    if (e.target && e.target.id === "buscador-prov") {
      paginaActual = 1; renderTabla();
    }
  });

  document.addEventListener("change", function (e) {
    if (e.target && e.target.id === "filtro-estado-prov") {
      paginaActual = 1; renderTabla();
    }
  });

  window.editarProveedor = editarProveedor;
  window.eliminarProveedor = eliminarProveedor;
  window.cargarProveedores = cargarProveedores;

  cargarProveedores();
})();