(function () {
  var todosRoles = [];
  var paginaActual = 1;
  var porPagina = 8;
  var modoEdicion = false;
  var rolEditandoId = null;
  var rolEliminarId = null;
  var rolPermisosId = null;
  var modalRolInstance = null;
  var modalPermisosInstance = null;
  var modalEliminarRolInstance = null;

  function getModalRolInstance() {
    if (!modalRolInstance) {
      modalRolInstance = new bootstrap.Modal(document.getElementById("modalRol"));
    }
    return modalRolInstance;
  }

  function getModalPermisosInstance() {
    if (!modalPermisosInstance) {
      modalPermisosInstance = new bootstrap.Modal(document.getElementById("modalPermisos"));
    }
    return modalPermisosInstance;
  }

  function getModalEliminarRolInstance() {
    if (!modalEliminarRolInstance) {
      modalEliminarRolInstance = new bootstrap.Modal(document.getElementById("modalEliminarRol"));
    }
    return modalEliminarRolInstance;
  }

  async function cargarRoles() {
    try {
      const res = await fetch("/auth/roles");
      todosRoles = await res.json();
      document.getElementById("total-roles").textContent = todosRoles.length;
      paginaActual = 1;
      renderTabla();
    } catch {
      document.getElementById("tabla-roles").innerHTML =
        `<tr><td colspan="6" class="text-center text-danger">Error al cargar roles.</td></tr>`;
    }
  }

  function rolesFiltrados() {
    const q = document.getElementById("buscador-roles").value.toLowerCase();
    return todosRoles.filter(r => {
      return r.nombre_rol.toLowerCase().includes(q);
    });
  }

  function renderTabla() {
    const filtrados = rolesFiltrados();
    const total = filtrados.length;
    const totalPaginas = Math.ceil(total / porPagina);
    const inicio = (paginaActual - 1) * porPagina;
    const pagina = filtrados.slice(inicio, inicio + porPagina);

    document.getElementById("info-paginacion-roles").textContent =
      `Mostrando ${pagina.length} de ${total} roles`;

    const tbody = document.getElementById("tabla-roles");
    if (pagina.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No se encontraron roles.</td></tr>`;
    } else {
      tbody.innerHTML = pagina.map((r, i) => `
      <tr>
        <td>${inicio + i + 1}</td>
        <td><i class="ri-key-2-line me-1 text-muted"></i><strong>${r.nombre_rol}</strong></td>
        <td>
          ${r.es_jefatura == 1
            ? '<span class="badge bg-info-subtle text-info">SÍ</span>'
            : '<span class="badge bg-light text-dark">NO</span>'}
        </td>
        <td>
          ${r.estado == 1
            ? '<span class="badge bg-success-subtle text-success">Activo</span>'
            : '<span class="badge bg-danger-subtle text-danger">Inactivo</span>'}
        </td>
        <td>${r.creado_en ? new Date(r.creado_en).toLocaleDateString("es-PE") : "-"}</td>
        <td class="text-center">
          <div class="d-flex gap-1 justify-content-center">
            <button class="btn btn-sm btn-soft-primary" onclick="editarRol(${r.id})" title="Editar Rol">
              <i class="ri-edit-line"></i>
            </button>
            <button class="btn btn-sm btn-soft-warning" onclick="gestionarPermisos(${r.id}, '${r.nombre_rol}')" title="Gestionar Permisos">
              <i class="ri-key-2-line"></i>
            </button>
            <button class="btn btn-sm btn-soft-danger" onclick="eliminarRol(${r.id})" title="Eliminar Rol">
              <i class="ri-delete-bin-line"></i>
            </button>
          </div>
        </td>
      </tr>`).join("");
    }

    const controles = document.getElementById("controles-paginacion-roles");
    controles.innerHTML = "";
    for (let p = 1; p <= totalPaginas; p++) {
      const btn = document.createElement("button");
      btn.className = `btn btn-sm ${p === paginaActual ? "btn-primary" : "btn-light"}`;
      btn.textContent = p;
      btn.onclick = () => { paginaActual = p; renderTabla(); };
      controles.appendChild(btn);
    }
  }

  function editarRol(id) {
    const r = todosRoles.find(r => r.id === id);
    if (!r) return;

    modoEdicion = true;
    rolEditandoId = id;

    document.getElementById("rol_nombre").value = r.nombre_rol;
    document.getElementById("rol_jefatura").value = r.es_jefatura;
    document.getElementById("rol_estado").value = r.estado;

    document.getElementById("btn-registrar-rol").innerHTML = '<i class="ri-save-line me-1"></i> Actualizar Rol';
    document.getElementById("btn-registrar-rol").className = "btn btn-warning fw-semibold px-4";
    document.getElementById("modalRolLabel").textContent = "Actualizar Rol";

    getModalRolInstance().show();
  }

  function eliminarRol(id) {
    rolEliminarId = id;
    getModalEliminarRolInstance().show();
  }

  async function gestionarPermisos(id, nombre) {
    rolPermisosId = id;
    document.getElementById("nombre-rol-permisos").textContent = nombre;

    // Reset checkboxes
    document.querySelectorAll(".permiso-chk").forEach(chk => chk.checked = false);

    try {
      const res = await fetch(`/auth/roles/${id}/permisos`);
      if (res.ok) {
        const permisosActivos = await res.json();
        permisosActivos.forEach(key => {
          const chk = document.querySelector(`.permiso-chk[value="${key}"]`);
          if (chk) {
            chk.checked = true;
          }
        });
        getModalPermisosInstance().show();
      } else {
        mostrarAlertaRoles("Error al cargar los permisos del rol.", "danger");
      }
    } catch {
      mostrarAlertaRoles("Error de conexión al cargar permisos.", "danger");
    }
  }

  function limpiarFormularioRol() {
    modoEdicion = false;
    rolEditandoId = null;
    document.getElementById("rol_nombre").value = "";
    document.getElementById("rol_jefatura").value = "0";
    document.getElementById("rol_estado").value = "1";
    document.getElementById("btn-registrar-rol").innerHTML = '<i class="ri-save-line me-1"></i> Registrar Rol';
    document.getElementById("btn-registrar-rol").className = "btn btn-primary fw-semibold px-4";
  }

  function mostrarAlertaRoles(mensaje, tipo) {
    const alertContainer = document.getElementById("mensaje-alerta-rol") || document.getElementById("mensaje-alerta-permisos");
    if (alertContainer) {
      alertContainer.innerHTML = `
        <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
          ${mensaje}
          <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>`;
      setTimeout(() => alertContainer.innerHTML = "", 5000);
    } else {
      alert(mensaje);
    }
  }

  // Event handlers
  const btnRegistrarRol = document.getElementById("btn-registrar-rol");
  if (btnRegistrarRol) {
    btnRegistrarRol.onclick = async function () {
      const nombre = document.getElementById("rol_nombre").value.trim();
      const es_jefatura = parseInt(document.getElementById("rol_jefatura").value);
      const estado = parseInt(document.getElementById("rol_estado").value);

      if (!nombre) {
        mostrarAlertaRoles("El nombre del rol es obligatorio.", "danger");
        return;
      }

      try {
        let res;
        if (modoEdicion) {
          res = await fetch(`/auth/roles/${rolEditandoId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre_rol: nombre, es_jefatura, estado })
          });
        } else {
          res = await fetch("/auth/roles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre_rol: nombre, es_jefatura, estado })
          });
        }

        const data = await res.json();
        if (res.ok) {
          mostrarAlertaRoles(modoEdicion ? "Rol actualizado correctamente." : "Rol registrado correctamente.", "success");
          limpiarFormularioRol();
          cargarRoles();
          getModalRolInstance().hide();
        } else {
          mostrarAlertaRoles(data.detail || "Error al guardar.", "danger");
        }
      } catch {
        mostrarAlertaRoles("Error de conexión.", "danger");
      }
    };
  }

  const btnConfirmarEliminarRol = document.getElementById("btn-confirmar-eliminar-rol");
  if (btnConfirmarEliminarRol) {
    btnConfirmarEliminarRol.onclick = async function () {
      getModalEliminarRolInstance().hide();
      try {
        const res = await fetch(`/auth/roles/${rolEliminarId}`, { method: "DELETE" });
        const data = await res.json();
        if (res.ok) {
          mostrarAlertaRoles("Rol eliminado correctamente.", "success");
          cargarRoles();
        } else {
          mostrarAlertaRoles(data.detail || "Error al eliminar el rol.", "danger");
        }
      } catch {
        mostrarAlertaRoles("Error de conexión.", "danger");
      }
    };
  }

  const btnGuardarPermisos = document.getElementById("btn-guardar-permisos");
  if (btnGuardarPermisos) {
    btnGuardarPermisos.onclick = async function () {
      const permiso_keys = [];
      document.querySelectorAll(".permiso-chk:checked").forEach(chk => {
        permiso_keys.push(chk.value);
      });

      try {
        const res = await fetch(`/auth/roles/${rolPermisosId}/permisos`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permiso_keys })
        });
        const data = await res.json();
        if (res.ok) {
          mostrarAlertaRoles("Permisos actualizados correctamente.", "success");
          getModalPermisosInstance().hide();
        } else {
          mostrarAlertaRoles(data.detail || "Error al guardar permisos.", "danger");
        }
      } catch {
        mostrarAlertaRoles("Error de conexión al guardar permisos.", "danger");
      }
    };
  }

  const btnLimpiarRol = document.getElementById("btn-limpiar-rol");
  if (btnLimpiarRol) {
    btnLimpiarRol.onclick = function () {
      limpiarFormularioRol();
    };
  }

  const btnNuevoRol = document.getElementById("btn-nuevo-rol");
  if (btnNuevoRol) {
    btnNuevoRol.onclick = function () {
      limpiarFormularioRol();
      document.getElementById("modalRolLabel").textContent = "Registrar Nuevo Rol";
      getModalRolInstance().show();
    };
  }

  const buscadorRoles = document.getElementById("buscador-roles");
  if (buscadorRoles) {
    buscadorRoles.oninput = function () {
      paginaActual = 1;
      renderTabla();
    };
  }

  // Export functions to global scope
  window.editarRol = editarRol;
  window.eliminarRol = eliminarRol;
  window.gestionarPermisos = gestionarPermisos;
  window.cargarRoles = cargarRoles;

  cargarRoles();
  limpiarFormularioRol();
})();
