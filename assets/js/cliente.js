(function () {
  var todosClientes = [];
  var paginaActual = 1;
  var porPagina = 8;
  var modoEdicion = false;
  var clienteEditandoId = null;
  var clienteEliminarId = null;
  var modalEliminarInstance = null;
  var modalClienteInstance = null;

  function getModalInstance() {
    if (!modalClienteInstance) {
      modalClienteInstance = new bootstrap.Modal(document.getElementById("modalCliente"));
    }
    return modalClienteInstance;
  }

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
    document.getElementById("modalClienteLabel").textContent = "Actualizar Cliente";

    getModalInstance().show();
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
    document.getElementById("modalClienteLabel").textContent = "Registrar Nuevo Cliente";
  }

  function mostrarAlerta(mensaje, tipo) {
    document.getElementById("mensaje-alerta").innerHTML = `
      <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>`;
    setTimeout(() => document.getElementById("mensaje-alerta").innerHTML = "", 5000);
  }

  const btnRegistrar = document.getElementById("btn-registrar-cli");
  if (btnRegistrar) {
    btnRegistrar.onclick = async function () {
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
          getModalInstance().hide();
        } else {
          mostrarAlerta(data.detail || "Error al guardar.", "danger");
        }
      } catch {
        mostrarAlerta("Error de conexión.", "danger");
      }
    };
  }

  const btnNuevo = document.getElementById("btn-nuevo-cliente");
  if (btnNuevo) {
    btnNuevo.onclick = function () {
      limpiarFormulario();
      getModalInstance().show();
    };
  }

  const btnLimpiar = document.getElementById("btn-limpiar-cli");
  if (btnLimpiar) {
    btnLimpiar.onclick = function () {
      limpiarFormulario();
    };
  }

  const btnConfirmarEliminar = document.getElementById("btn-confirmar-eliminar-cli");
  if (btnConfirmarEliminar) {
    btnConfirmarEliminar.onclick = async function () {
      if (modalEliminarInstance) modalEliminarInstance.hide();
      try {
        const res = await fetch(`/clientes/${clienteEliminarId}`, { method: "DELETE" });
        if (res.ok) { mostrarAlerta("Cliente eliminado correctamente.", "success"); cargarClientes(); }
        else mostrarAlerta("Error al eliminar.", "danger");
      } catch {
        mostrarAlerta("Error de conexión.", "danger");
      }
    };
  }

  function mostrarBadgeAutofill(texto, clase) {
    const badge = document.getElementById("cli-autofill-status");
    if (!badge) return;
    badge.textContent = texto;
    badge.className = `badge ${clase || "bg-info text-white"}`;
    badge.style.display = "inline-block";
    setTimeout(() => { badge.style.display = "none"; }, 4000);
  }

  async function autocompletarPorDocumentoCliente(doc) {
    const numero = (doc || "").trim();
    if (numero.length !== 8 && numero.length !== 11) return;
    mostrarBadgeAutofill("Consultando documento...", "bg-primary text-white");
    try {
      const res = await fetch(`/auth/consultar-documento?numero=${encodeURIComponent(numero)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.encontrado) {
        const inpNombre = document.getElementById("cli_nombres");
        const inpDir = document.getElementById("cli_direccion");
        const inpTel = document.getElementById("cli_telefono");
        const inpEmail = document.getElementById("cli_email");
        if (data.nombre && (!inpNombre.value.trim() || !modoEdicion)) inpNombre.value = data.nombre;
        if (data.direccion && !inpDir.value.trim()) inpDir.value = data.direccion;
        if (data.telefono && !inpTel.value.trim()) inpTel.value = data.telefono;
        if (data.email && !inpEmail.value.trim()) inpEmail.value = data.email;
        mostrarBadgeAutofill(
          data.fuente === "SUNAT_RENIEC" ? `Datos obtenidos de ${data.tipo}` : "Datos recuperados del sistema",
          "bg-success text-white"
        );
      } else {
        mostrarBadgeAutofill("Documento sin padrón externo", "bg-secondary text-white");
      }
    } catch {
      // Silencioso en autocompletado
    }
  }

  async function autocompletarPorEmailCliente(emailVal) {
    const email = (emailVal || "").trim();
    if (!email || !email.includes("@")) return;
    try {
      const res = await fetch(`/auth/autocompletar-email?email=${encodeURIComponent(email)}`);
      if (!res.ok) return;
      const data = await res.json();
      const inpNombre = document.getElementById("cli_nombres");
      const inpDoc = document.getElementById("cli_documento");
      const inpTel = document.getElementById("cli_telefono");
      const inpDir = document.getElementById("cli_direccion");

      if (data.encontrado) {
        if (data.nombre && !inpNombre.value.trim()) inpNombre.value = data.nombre;
        if (data.documento && !inpDoc.value.trim()) inpDoc.value = data.documento;
        if (data.telefono && !inpTel.value.trim()) inpTel.value = data.telefono;
        if (data.direccion && !inpDir.value.trim()) inpDir.value = data.direccion;
        mostrarBadgeAutofill(`Autocompletado desde ${data.origen}`, "bg-success text-white");
      } else if (data.nombre_sugerido && !inpNombre.value.trim()) {
        inpNombre.value = data.nombre_sugerido;
        mostrarBadgeAutofill("Nombre sugerido desde correo", "bg-info text-white");
      }
    } catch {
      // Silencioso
    }
  }

  const inpDocCli = document.getElementById("cli_documento");
  if (inpDocCli) {
    inpDocCli.addEventListener("input", function () {
      this.value = this.value.replace(/\D/g, "");
      if (this.value.length === 8 || this.value.length === 11) {
        autocompletarPorDocumentoCliente(this.value);
      }
    });
  }

  const btnBuscarDocCli = document.getElementById("btn-buscar-doc-cli");
  if (btnBuscarDocCli) {
    btnBuscarDocCli.onclick = function () {
      const doc = document.getElementById("cli_documento")?.value || "";
      if (doc.length !== 8 && doc.length !== 11) {
        mostrarAlerta("Ingrese un DNI (8 dígitos) o RUC (11 dígitos) para consultar.", "warning");
        return;
      }
      autocompletarPorDocumentoCliente(doc);
    };
  }

  const inpEmailCli = document.getElementById("cli_email");
  if (inpEmailCli) {
    inpEmailCli.addEventListener("blur", function () {
      autocompletarPorEmailCliente(this.value);
    });
    inpEmailCli.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === "Tab") {
        autocompletarPorEmailCliente(this.value);
      }
    });
  }

  const buscador = document.getElementById("buscador-cli");
  if (buscador) {
    buscador.oninput = function () {
      paginaActual = 1; renderTabla();
    };
  }

  const filtroEstado = document.getElementById("filtro-estado-cli");
  if (filtroEstado) {
    filtroEstado.onchange = function () {
      paginaActual = 1; renderTabla();
    };
  }

  window.editarCliente = editarCliente;
  window.eliminarCliente = eliminarCliente;
  window.cargarClientes = cargarClientes;

  cargarClientes();
})();