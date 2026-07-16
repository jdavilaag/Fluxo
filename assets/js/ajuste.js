(function () {
  var todosAjustes = [];
  var todosProductos = [];
  var paginaActual = 1;
  var porPagina = 8;
  var modalAjusteInstance = null;
  var modalProcesarInstance = null;
  var ajusteSeleccionadoId = null;
  var esAdmin = false;

  async function iniciarAjustes() {
    await verificarSesion();
    await cargarProductos();
    await cargarAjustes();
  }

  async function verificarSesion() {
    try {
      const res = await fetch("/auth/sesion");
      if (res.ok) {
        const sesion = await res.json();
        esAdmin = sesion.rol_id === 1;
      }
    } catch {
      esAdmin = false;
    }

    // Ocultar columna acciones si no es admin
    const colAcc = document.getElementById("columna-acciones");
    if (colAcc) {
      colAcc.style.display = esAdmin ? "" : "none";
    }
  }

  async function cargarProductos() {
    try {
      const res = await fetch("/productos/");
      if (res.ok) {
        todosProductos = await res.json();
        const select = document.getElementById("aju_producto");
        if (select) {
          select.innerHTML = '<option value="">Seleccione un producto</option>';
          todosProductos.filter(p => p.estado == 1).forEach(p => {
            select.innerHTML += `<option value="${p.id}">${p.nombre_producto} (Stock: ${p.stock_actual})</option>`;
          });
        }
      }
    } catch {
      console.error("Error al cargar productos");
    }
  }

  async function cargarLotes(productoId) {
    const selectLote = document.getElementById("aju_lote");
    if (!selectLote) return;

    if (!productoId) {
      selectLote.innerHTML = '<option value="">Seleccione lote</option>';
      selectLote.disabled = true;
      return;
    }

    try {
      const res = await fetch(`/productos/${productoId}/lotes`);
      if (res.ok) {
        const lotes = await res.json();
        selectLote.innerHTML = '<option value="">Seleccione lote</option>';
        if (lotes.length > 0) {
          lotes.forEach(l => {
            selectLote.innerHTML += `<option value="${l.id}">${l.nro_lote} (Stock: ${l.stock_lote})</option>`;
          });
          selectLote.disabled = false;
        } else {
          selectLote.innerHTML = '<option value="">Sin lotes activos</option>';
          selectLote.disabled = true;
        }
      }
    } catch {
      console.error("Error al cargar lotes");
    }
  }

  async function cargarAjustes() {
    try {
      const res = await fetch("/ajustes/");
      if (res.ok) {
        todosAjustes = await res.json();
        actualizarContadores();
        paginaActual = 1;
        renderTabla();
      } else {
        throw new Error();
      }
    } catch {
      const tbody = document.getElementById("tabla-ajustes");
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center text-danger">Error al cargar ajustes de inventario.</td></tr>`;
      }
    }
  }

  function actualizarContadores() {
    const total = todosAjustes.length;
    const pendientes = todosAjustes.filter(a => a.estado === "PENDIENTE").length;
    const aprobados = todosAjustes.filter(a => a.estado === "APROBADO").length;
    const rechazados = todosAjustes.filter(a => a.estado === "RECHAZADO").length;

    const elTotal = document.getElementById("contador-total-ajustes");
    const elPend = document.getElementById("contador-pendientes-ajustes");
    const elAprob = document.getElementById("contador-aprobados-ajustes");
    const elRech = document.getElementById("contador-rechazados-ajustes");

    if (elTotal) elTotal.textContent = total;
    if (elPend) elPend.textContent = pendientes;
    if (elAprob) elAprob.textContent = aprobados;
    if (elRech) elRech.textContent = rechazados;
  }

  function ajustesFiltrados() {
    const q = document.getElementById("buscador-ajuste").value.toLowerCase();
    const estado = document.getElementById("filtro-estado-ajuste").value;
    const tipo = document.getElementById("filtro-tipo-ajuste").value;

    return todosAjustes.filter(a => {
      const coincideBuscador = q === "" ||
        (a.producto_nombre && a.producto_nombre.toLowerCase().includes(q)) ||
        (a.observacion && a.observacion.toLowerCase().includes(q)) ||
        (a.motivo && a.motivo.toLowerCase().includes(q)) ||
        (a.nro_lote && a.nro_lote.toLowerCase().includes(q));
      
      const coincideEstado = estado === "" || a.estado === estado;
      const coincideTipo = tipo === "" || a.tipo_ajuste === tipo;

      return coincideBuscador && coincideEstado && coincideTipo;
    });
  }

  function renderTabla() {
    const filtrados = ajustesFiltrados();
    const total = filtrados.length;
    const totalPaginas = Math.ceil(total / porPagina);
    const inicio = (paginaActual - 1) * porPagina;
    const pagina = filtrados.slice(inicio, inicio + porPagina);

    const info = document.getElementById("info-paginacion-ajuste");
    if (info) {
      info.textContent = `Mostrando ${pagina.length} de ${total} ajustes`;
    }

    const tbody = document.getElementById("tabla-ajustes");
    if (!tbody) return;

    if (pagina.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-muted">No se encontraron solicitudes de ajuste.</td></tr>`;
    } else {
      tbody.innerHTML = pagina.map((a, i) => {
        let badgeEstado = "";
        if (a.estado === "PENDIENTE") {
          badgeEstado = '<span class="badge bg-warning-subtle text-warning">Pendiente</span>';
        } else if (a.estado === "APROBADO") {
          badgeEstado = '<span class="badge bg-success-subtle text-success">Aprobado</span>';
        } else {
          badgeEstado = '<span class="badge bg-danger-subtle text-danger">Rechazado</span>';
        }

        const badgeTipo = a.tipo_ajuste === "ENTRADA"
          ? '<span class="badge bg-success-subtle text-success"><i class="ri-arrow-left-down-line me-1"></i>Entrada</span>'
          : '<span class="badge bg-danger-subtle text-danger"><i class="ri-arrow-right-up-line me-1"></i>Salida</span>';

        const fechaStr = a.fecha_solicitud ? new Date(a.fecha_solicitud).toLocaleString("es-PE") : "-";

        let botonesAccion = "";
        if (esAdmin) {
          if (a.estado === "PENDIENTE") {
            botonesAccion = `
              <button class="btn btn-xs btn-soft-info" onclick="abrirRevisionAjuste(${a.id})" title="Revisar solicitud">
                <i class="ri-survey-line fs-14"></i>
              </button>
            `;
          } else {
            botonesAccion = `
              <button class="btn btn-xs btn-soft-secondary" onclick="abrirRevisionAjuste(${a.id})" title="Ver detalle">
                <i class="ri-eye-line fs-14"></i>
              </button>
            `;
          }
        }

        return `
          <tr>
            <td>${inicio + i + 1}</td>
            <td><span class="fw-semibold">${a.producto_nombre}</span></td>
            <td><span class="text-muted">${a.nro_lote || "-"}</span></td>
            <td>${badgeTipo}</td>
            <td><strong>${a.cantidad}</strong></td>
            <td><small class="text-uppercase">${a.motivo}</small></td>
            <td><i class="ri-user-line me-1 text-muted fs-12"></i>${a.usuario_solicitante_nombre}</td>
            <td>${badgeEstado}</td>
            <td>${fechaStr}</td>
            ${esAdmin ? `<td class="text-center">${botonesAccion}</td>` : ""}
          </tr>`;
      }).join("");
    }

    const controles = document.getElementById("controles-paginacion-ajuste");
    if (controles) {
      controles.innerHTML = "";
      for (let p = 1; p <= totalPaginas; p++) {
        const btn = document.createElement("button");
        btn.className = `btn btn-sm ${p === paginaActual ? "btn-primary" : "btn-light"}`;
        btn.textContent = p;
        btn.onclick = () => { paginaActual = p; renderTabla(); };
        controles.appendChild(btn);
      }
    }
  }

  function mostrarAlerta(mensaje, tipo) {
    const alertDiv = document.getElementById("mensaje-alerta");
    if (alertDiv) {
      alertDiv.innerHTML = `
        <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
          ${mensaje}
          <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>`;
      setTimeout(() => alertDiv.innerHTML = "", 5000);
    }
  }

  function abrirRevisionAjuste(ajusteId) {
    const a = todosAjustes.find(x => x.id === ajusteId);
    if (!a) return;

    ajusteSeleccionadoId = ajusteId;

    document.getElementById("det-aju-producto").textContent = a.producto_nombre;
    document.getElementById("det-aju-lote").textContent = a.nro_lote || "-";
    document.getElementById("det-aju-tipo").innerHTML = a.tipo_ajuste === "ENTRADA" ? "ENTRADA (Aumenta stock)" : "SALIDA (Disminuye stock)";
    document.getElementById("det-aju-cantidad").textContent = a.cantidad;
    document.getElementById("det-aju-motivo").textContent = a.motivo;
    document.getElementById("det-aju-solicitante").textContent = a.usuario_solicitante_nombre;
    document.getElementById("det-aju-observacion").textContent = a.observacion || "-";
    document.getElementById("det-aju-estado").textContent = a.estado;

    const divAcciones = document.getElementById("seccion-aprobacion-acciones");
    if (divAcciones) {
      divAcciones.style.display = (a.estado === "PENDIENTE" && esAdmin) ? "block" : "none";
    }

    const modalEl = document.getElementById("modalProcesarAjuste");
    modalProcesarInstance = new bootstrap.Modal(modalEl);
    modalProcesarInstance.show();
  }

  async function procesarAjuste(aprobar) {
    if (!ajusteSeleccionadoId) return;

    if (modalProcesarInstance) {
      modalProcesarInstance.hide();
    }

    try {
      const res = await fetch(`/ajustes/${ajusteSeleccionadoId}/procesar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aprobar })
      });

      const data = await res.json();
      if (res.ok) {
        mostrarAlerta(aprobar ? "Ajuste de inventario aprobado con éxito." : "Ajuste de inventario rechazado.", "success");
        cargarAjustes();
      } else {
        mostrarAlerta(data.detail || "Error al procesar la solicitud.", "danger");
      }
    } catch {
      mostrarAlerta("Error de conexión al procesar.", "danger");
    }
  }

  // ── Enlace de Eventos ──

  const selectProducto = document.getElementById("aju_producto");
  if (selectProducto) {
    selectProducto.onchange = function () {
      cargarLotes(this.value);
    };
  }

  const btnNuevo = document.getElementById("btn-nuevo-ajuste");
  if (btnNuevo) {
    btnNuevo.onclick = function () {
      document.getElementById("form-ajuste").reset();
      const selectLote = document.getElementById("aju_lote");
      if (selectLote) {
        selectLote.innerHTML = '<option value="">Seleccione lote</option>';
        selectLote.disabled = true;
      }
      const modalEl = document.getElementById("modalAjuste");
      modalAjusteInstance = new bootstrap.Modal(modalEl);
      modalAjusteInstance.show();
    };
  }

  const btnRegistrar = document.getElementById("btn-registrar-aju");
  if (btnRegistrar) {
    btnRegistrar.onclick = async function () {
      const producto_id = document.getElementById("aju_producto").value;
      const lote_id = document.getElementById("aju_lote").value;
      const tipo_ajuste = document.getElementById("aju_tipo").value;
      const cantidad = parseFloat(document.getElementById("aju_cantidad").value);
      const motivo = document.getElementById("aju_motivo").value;
      const observacion = document.getElementById("aju_observacion").value.trim();

      if (!producto_id || !tipo_ajuste || !cantidad || !motivo) {
        mostrarAlerta("Por favor complete los campos obligatorios.", "danger"); return;
      }
      if (cantidad <= 0) {
        mostrarAlerta("La cantidad debe ser mayor a 0.", "danger"); return;
      }

      const body = {
        producto_id: parseInt(producto_id),
        lote_id: lote_id ? parseInt(lote_id) : null,
        tipo_ajuste,
        cantidad,
        motivo,
        observacion: observacion || null
      };

      try {
        const res = await fetch("/ajustes/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });

        const data = await res.json();
        if (res.ok) {
          mostrarAlerta("Solicitud de ajuste registrada correctamente.", "success");
          if (modalAjusteInstance) modalAjusteInstance.hide();
          cargarAjustes();
        } else {
          mostrarAlerta(data.detail || "Error al registrar el ajuste.", "danger");
        }
      } catch {
        mostrarAlerta("Error de conexión al enviar.", "danger");
      }
    };
  }

  const btnAprobarModal = document.getElementById("btn-aprobar-aju-modal");
  if (btnAprobarModal) {
    btnAprobarModal.onclick = () => procesarAjuste(true);
  }

  const btnRechazarModal = document.getElementById("btn-rechazar-aju-modal");
  if (btnRechazarModal) {
    btnRechazarModal.onclick = () => procesarAjuste(false);
  }

  const btnFiltrar = document.getElementById("btn-filtrar-ajuste");
  if (btnFiltrar) {
    btnFiltrar.onclick = () => {
      paginaActual = 1; renderTabla();
    };
  }

  const buscador = document.getElementById("buscador-ajuste");
  if (buscador) {
    buscador.oninput = () => {
      paginaActual = 1; renderTabla();
    };
  }

  // Expose globals
  window.cargarAjustes = cargarAjustes;
  window.abrirRevisionAjuste = abrirRevisionAjuste;
  window.iniciarAjustes = iniciarAjustes;

  iniciarAjustes();
})();
