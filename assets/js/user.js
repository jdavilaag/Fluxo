(function () {
  var ROLES = {};
  var todosUsuarios = [];
  var paginaActual = 1;
  var porPagina = 8;
  var modoEdicion = false;
  var usuarioEditandoId = null;
  var usuarioEliminarId = null;
  var modalUsuarioInstance = null;

  function getModalInstance() {
    if (!modalUsuarioInstance) {
      modalUsuarioInstance = new bootstrap.Modal(document.getElementById("modalUsuario"));
    }
    return modalUsuarioInstance;
  }

  async function inicializarRoles() {
    try {
      const res = await fetch("/auth/roles");
      if (res.ok) {
        const data = await res.json();
        ROLES = {};
        data.forEach(r => {
          ROLES[r.id] = r.nombre_rol;
        });
        const selectRol = document.getElementById("rol");
        if (selectRol) {
          selectRol.innerHTML = '<option value="">Seleccione un rol</option>' +
            data.filter(r => r.estado == 1).map(r => `<option value="${r.id}">${r.nombre_rol}</option>`).join("");
        }
      }
    } catch (err) {
      console.error("Error al inicializar roles:", err);
    }
    await cargarUsuarios();
  }

  async function cargarUsuarios() {
    try {
      const res = await fetch("/auth/usuarios");
      todosUsuarios = await res.json();
      document.getElementById("total-usuarios").textContent = todosUsuarios.length;
      paginaActual = 1;
      renderTabla();
    } catch {
      document.getElementById("tabla-usuarios").innerHTML =
        `<tr><td colspan="7" class="text-center text-danger">Error al cargar usuarios.</td></tr>`;
    }
  }

  function usuariosFiltrados() {
    const q = document.getElementById("buscador").value.toLowerCase();
    const estado = document.getElementById("filtro-estado").value;
    return todosUsuarios.filter(u => {
      const coincide = u.nombre_completo.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const estadoOk = estado === "" || String(u.estado) === estado;
      return coincide && estadoOk;
    });
  }

  function renderTabla() {
    const filtrados = usuariosFiltrados();
    const total = filtrados.length;
    const totalPaginas = Math.ceil(total / porPagina);
    const inicio = (paginaActual - 1) * porPagina;
    const pagina = filtrados.slice(inicio, inicio + porPagina);

    document.getElementById("info-paginacion").textContent =
      `Mostrando ${pagina.length} de ${total} usuarios`;

    const tbody = document.getElementById("tabla-usuarios");
    if (pagina.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No se encontraron usuarios.</td></tr>`;
    } else {
      tbody.innerHTML = pagina.map((u, i) => `
      <tr>
        <td>${inicio + i + 1}</td>
        <td><i class="ri-user-line me-1 text-muted"></i>${u.nombre_completo}</td>
        <td>${u.email}</td>
        <td><span class="badge bg-primary-subtle text-primary">${ROLES[u.rol_id] || "Sin rol"}</span></td>
        <td>${u.estado == 1
          ? '<span class="badge bg-success-subtle text-success">Activo</span>'
          : '<span class="badge bg-danger-subtle text-danger">Inactivo</span>'}</td>
        <td>${u.creado_en ? new Date(u.creado_en).toLocaleDateString("es-PE") : "-"}</td>
        <td class="text-center d-flex gap-1 justify-content-center">
          <button class="btn btn-sm btn-soft-primary" onclick="editarUsuario(${u.id})" title="Editar">
            <i class="ri-edit-line"></i>
          </button>
          <button class="btn btn-sm btn-soft-danger" onclick="eliminarUsuario(${u.id})" title="Eliminar">
            <i class="ri-delete-bin-line"></i>
          </button>
        </td>
      </tr>`).join("");
    }

    const controles = document.getElementById("controles-paginacion");
    controles.innerHTML = "";
    for (let p = 1; p <= totalPaginas; p++) {
      const btn = document.createElement("button");
      btn.className = `btn btn-sm ${p === paginaActual ? "btn-primary" : "btn-light"}`;
      btn.textContent = p;
      btn.onclick = () => { paginaActual = p; renderTabla(); };
      controles.appendChild(btn);
    }
  }

  function editarUsuario(id) {
    const u = todosUsuarios.find(u => u.id === id);
    if (!u) return;

    modoEdicion = true;
    usuarioEditandoId = id;

    document.getElementById("usr_nombre").value = u.nombre_completo;
    document.getElementById("usr_email").value = u.email;
    document.getElementById("usr_pass").value = "";
    document.getElementById("rol").value = u.rol_id;
    document.getElementById("estado").value = u.estado;

    document.getElementById("btn-registrar").innerHTML = '<i class="ri-save-line me-1"></i> Actualizar Usuario';
    document.getElementById("btn-registrar").className = "btn btn-warning fw-semibold px-4";
    document.getElementById("usr_pass").placeholder = "Dejar vacío para no cambiar";
    document.getElementById("modalUsuarioLabel").textContent = "Actualizar Usuario";

    getModalInstance().show();
  }

  var modalEliminarInstance = null;

  function eliminarUsuario(id) {
    usuarioEliminarId = id;
    const modalEl = document.getElementById("modalEliminar");
    modalEl.removeAttribute("aria-hidden");
    modalEliminarInstance = new bootstrap.Modal(modalEl);
    modalEliminarInstance.show();
  }


  function limpiarFormulario() {
    modoEdicion = false;
    usuarioEditandoId = null;
    document.getElementById("usr_nombre").value = "";
    document.getElementById("usr_email").value = "";
    document.getElementById("usr_pass").value = "";
    document.getElementById("usr_pass").placeholder = "Ingrese contraseña";
    document.getElementById("rol").value = "";
    document.getElementById("estado").value = "1";
    document.getElementById("btn-registrar").innerHTML = '<i class="ri-save-line me-1"></i> Registrar Usuario';
    document.getElementById("btn-registrar").className = "btn btn-primary fw-semibold px-4";
  }

  function mostrarAlerta(mensaje, tipo) {
    document.getElementById("mensaje-alerta").innerHTML = `
      <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>`;
    setTimeout(() => document.getElementById("mensaje-alerta").innerHTML = "", 5000);
  }

  // ── Eventos con onclick para evitar duplicados ──
  const btnRegistrar = document.getElementById("btn-registrar");
  if (btnRegistrar) {
    btnRegistrar.onclick = async function () {
      const nombre = document.getElementById("usr_nombre").value.trim();
      const email = document.getElementById("usr_email").value.trim();
      const password = document.getElementById("usr_pass").value;
      const rol_id = document.getElementById("rol").value;
      const estado = document.getElementById("estado").value;

      if (!nombre || !email || !rol_id) {
        mostrarAlerta("Por favor complete todos los campos.", "danger"); return;
      }

      const emailRegex = /^[\w\.-]+@[\w\.-]+\.\w+$/;
      if (!emailRegex.test(email)) {
        mostrarAlerta("Ingrese un email válido.", "danger"); return;
      }

      if (!modoEdicion && !password) {
        mostrarAlerta("La contraseña es obligatoria.", "danger"); return;
      }
      if (!modoEdicion && password) {
        if (password.length < 8) {
          mostrarAlerta("La contraseña debe tener al menos 8 caracteres.", "danger"); return;
        }
        if (!/[A-Z]/.test(password)) {
          mostrarAlerta("La contraseña debe tener al menos una mayúscula.", "danger"); return;
        }
        if (!/[0-9]/.test(password)) {
          mostrarAlerta("La contraseña debe tener al menos un número.", "danger"); return;
        }
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
          mostrarAlerta("La contraseña debe tener al menos un carácter especial.", "danger"); return;
        }
      }

      try {
        let res;
        if (modoEdicion) {
          const body = { nombre_completo: nombre, email, rol_id: parseInt(rol_id), estado: parseInt(estado) };
          if (password) body.password = password;
          res = await fetch(`/auth/usuarios/${usuarioEditandoId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
          });
        } else {
          res = await fetch("/auth/registro", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre_completo: nombre, email, password, rol_id: parseInt(rol_id), estado: parseInt(estado) })
          });
        }

        const data = await res.json();
        if (res.ok) {
          mostrarAlerta(modoEdicion ? "Usuario actualizado correctamente." : "Usuario registrado correctamente.", "success");
          limpiarFormulario();
          cargarUsuarios();
          getModalInstance().hide();
        } else {
          mostrarAlerta(data.detail || "Error al guardar.", "danger");
        }
      } catch {
        mostrarAlerta("Error de conexión.", "danger");
      }
    };
  }

  const btnConfirmarEliminar = document.getElementById("btn-confirmar-eliminar");
  if (btnConfirmarEliminar) {
    btnConfirmarEliminar.onclick = async function () {
      const modal = bootstrap.Modal.getInstance(document.getElementById("modalEliminar"));
      if (modal) modal.hide();
      try {
        const res = await fetch(`/auth/usuarios/${usuarioEliminarId}`, { method: "DELETE" });
        if (res.ok) { mostrarAlerta("Usuario eliminado correctamente.", "success"); cargarUsuarios(); }
        else mostrarAlerta("Error al eliminar.", "danger");
      } catch {
        mostrarAlerta("Error de conexión.", "danger");
      }
    };
  }

  const togglePassword = document.getElementById("toggle-password");
  if (togglePassword) {
    togglePassword.onclick = function () {
      const input = document.getElementById("usr_pass");
      const icon = this.querySelector("i");
      if (input && icon) {
        input.type = input.type === "password" ? "text" : "password";
        icon.className = input.type === "password" ? "ri-eye-line" : "ri-eye-off-line";
      }
    };
  }

  const btnLimpiar = document.getElementById("btn-limpiar");
  if (btnLimpiar) {
    btnLimpiar.onclick = function () {
      limpiarFormulario();
    };
  }

  const btnNuevo = document.getElementById("btn-nuevo-usuario");
  if (btnNuevo) {
    btnNuevo.onclick = function () {
      limpiarFormulario();
      document.getElementById("modalUsuarioLabel").textContent = "Registrar Nuevo Usuario";
      getModalInstance().show();
    };
  }

  const buscador = document.getElementById("buscador");
  if (buscador) {
    buscador.oninput = function () {
      paginaActual = 1; renderTabla();
    };
  }

  const filtroEstado = document.getElementById("filtro-estado");
  if (filtroEstado) {
    filtroEstado.onchange = function () {
      paginaActual = 1; renderTabla();
    };
  }

  window.editarUsuario = editarUsuario;
  window.eliminarUsuario = eliminarUsuario;
  window.cargarUsuarios = cargarUsuarios;
  inicializarRoles();
  limpiarFormulario();
})();