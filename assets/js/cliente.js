(function () {
  var todosClientes = [];
  var paginaActual = 1;
  var porPagina = 8;
  var modoEdicion = false;
  var clienteEditandoId = null;
  var clienteEliminarId = null;
  var modalEliminarInstance = null;

  async function cargarClientes() {
    try {
      const res = await fetch("/clientes/");
      todosClientes = await res.json();
      document.getElementById("total-clientes").textContent = todosClientes.length;
      paginaActual = 1;
      renderTabla();
    } catch {
      document.getElementById("tabla-clientes").innerHTML =
        `<tr><td colspan="8" class="text-center text-danger">Error al cargar clientes.</td></tr>`;
    }
  }

  function clientesFiltrados() {
    const q = document.getElementById("buscador-cli").value.toLowerCase();
    const estado = document.getElementById("filtro-estado-cli").value;
    return todosClientes.filter(c => {
      const coincide = c.nombres.toLowerCase().includes(q) || c.documento.includes(q);
      const estadoOk = estado === "" || String(c.estado) === estado;
      return coincide && estadoOk;
    });
  }

  function renderTabla() {
    const filtrados = clientesFiltrados();
    const total = filtrados.length;
    const totalPaginas = Math.ceil(total / porPagina);
    const inicio = (paginaActual - 1) * porPagina;
    const pagina = filtrados.slice(inicio, inicio + porPagina);

    document.getElementById("info-paginacion-cli").textContent =
      `Mostrando ${pagina.length} de ${total} clientes`;

    const tbody = document.getElementById("tabla-clientes");
    if (pagina.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No se encontraron clientes.</td></tr>`;
    } else {
      tbody.innerHTML = pagina.map((c, i) => `
        <tr>
          <td>${inicio + i + 1}</td>
          <td><i class="ri-user-heart-line me-1 text-muted"></i>${c.documento}</td>
          <td>${c.nombres}</td>
          <td>${c.telefono || "-"}</td>
          <td>${c.email || "-"}</td>
          <td>${c.estado == 1
            ? '<span class="badge bg-success-subtle text-success">Activo</span>'
            : '<span class="badge bg-danger-subtle text-danger">Inactivo</span>'}</td>
          <td>${c.creado_en ? new Date(c.creado_en).toLocaleDateString("es-PE") : "-"}</td>
          <td class="text-center d-flex gap-1 justify-content-center">
            <button class="btn btn-sm btn-soft-primary" onclick="editarCliente(${c.id})" title="Editar">
              <i class="ri-edit-line"></i>
            </button>
            <button class="btn btn-sm btn-soft-danger" onclick="eliminarCliente(${c.id})" title="Eliminar">
              <i class="ri-delete-bin-line"></i>
            </button>
          </td>
        </tr>`).join("");
    }

    const controles = document.getElementById("controles-paginacion-cli");
    controles.innerHTML = "";
    for (let p = 1; p <= totalPaginas; p++) {
      const btn = document.createElement("button");
      btn.className = `btn btn-sm ${p === paginaActual ? "btn-primary" : "btn-light"}`;
      btn.textContent = p;
      btn.onclick = () => { paginaActual = p; renderTabla(); };
      controles.appendChild(btn);
    }
  }

  function editarCliente(id) {
    const c = todosClientes.find(c => c.id === id);
    if (!c) return;

    modoEdicion = true;
    clienteEditandoId = id;

    document.getElementById("cli_documento").value = c.documento;
    document.getElementById("cli_nombres").value = c.nombres;
    document.getElementById("cli_telefono").value = c.telefono || "";
    document.getElementById("cli_email").value = c.email || "";
    document.getElementById("cli_direccion").value = c.direccion || "";
    document.getElementById("cli_estado").value = c.estado;

    document.getElementById("btn-registrar-cli").innerHTML = '<i class="ri-save-line me-1"></i> Actualizar Cliente';
    document.getElementById("btn-registrar-cli").className = "btn btn-warning fw-semibold px-4";

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function eliminarCliente(id) {
    clienteEliminarId = id;
    const modalEl = document.getElementById("modalEliminarCli");
    modalEl.removeAttribute("aria-hidden");
    modalEliminarInstance = new bootstrap.Modal(modalEl);
    modalEliminarInstance.show();
  }

  function limpiarFormulario() {
    modoEdicion = false;
    clienteEditandoId = null;
    document.getElementById("cli_documento").value = "";
    document.getElementById("cli_nombres").value = "";
    document.getElementById("cli_telefono").value = "";
    document.getElementById("cli_email").value = "";
    document.getElementById("cli_direccion").value = "";
    document.getElementById("cli_estado").value = "1";
    document.getElementById("btn-registrar-cli").innerHTML = '<i class="ri-save-line me-1"></i> Registrar Cliente';
    document.getElementById("btn-registrar-cli").className = "btn btn-primary fw-semibold px-4";
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
    if (e.target && (e.target.id === "btn-registrar-cli" || e.target.closest("#btn-registrar-cli"))) {
      const documento = document.getElementById("cli_documento").value.trim();
      const nombres = document.getElementById("cli_nombres").value.trim();
      const telefono = document.getElementById("cli_telefono").value.trim();
      const email = document.getElementById("cli_email").value.trim();
      const direccion = document.getElementById("cli_direccion").value.trim();
      const estado = document.getElementById("cli_estado").value;

      if (!documento || !nombres) {
        mostrarAlerta("Documento y Nombres son obligatorios.", "danger"); return;
      }
      if (!/^\d{8,11}$/.test(documento)) {
        mostrarAlerta("El documento debe tener entre 8 y 11 dígitos.", "danger"); return;
      }

      try {
        let res;
        if (modoEdicion) {
          res = await fetch(`/clientes/${clienteEditandoId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ documento, nombres, telefono, email, direccion, estado: parseInt(estado) })
          });
        } else {
          res = await fetch("/clientes/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ documento, nombres, telefono, email, direccion, estado: parseInt(estado) })
          });
        }

        const data = await res.json();
        if (res.ok) {
          mostrarAlerta(modoEdicion ? "Cliente actualizado correctamente." : "Cliente registrado correctamente.", "success");
          limpiarFormulario();
          cargarClientes();
        } else {
          mostrarAlerta(data.detail || "Error al guardar.", "danger");
        }
      } catch {
        mostrarAlerta("Error de conexión.", "danger");
      }
    }

    if (e.target && (e.target.id === "btn-limpiar-cli" || e.target.closest("#btn-limpiar-cli"))) {
      limpiarFormulario();
    }

    if (e.target && e.target.id === "btn-confirmar-eliminar-cli") {
      if (modalEliminarInstance) modalEliminarInstance.hide();
      try {
        const res = await fetch(`/clientes/${clienteEliminarId}`, { method: "DELETE" });
        if (res.ok) { mostrarAlerta("Cliente eliminado correctamente.", "success"); cargarClientes(); }
        else mostrarAlerta("Error al eliminar.", "danger");
      } catch {
        mostrarAlerta("Error de conexión.", "danger");
      }
    }
  });

  document.addEventListener("input", function (e) {
    if (e.target && e.target.id === "buscador-cli") {
      paginaActual = 1; renderTabla();
    }
  });

  document.addEventListener("change", function (e) {
    if (e.target && e.target.id === "filtro-estado-cli") {
      paginaActual = 1; renderTabla();
    }
  });

  window.editarCliente = editarCliente;
  window.eliminarCliente = eliminarCliente;
  window.cargarClientes = cargarClientes;

  cargarClientes();
})();