(function () {
  var todasSeries = [];
  var paginaActual = 1;
  var porPagina = 8;
  var modoEdicion = false;
  var serieEditandoId = null;
  var serieEliminarId = null;
  var modalEliminarInstance = null;
  var modalComprobanteInstance = null;

  function getModalInstance() {
    if (!modalComprobanteInstance) {
      modalComprobanteInstance = new bootstrap.Modal(document.getElementById("modalComprobante"));
    }
    return modalComprobanteInstance;
  }

  async function cargarComprobantes() {
    try {
      const res = await fetch("/comprobante-series/");
      todasSeries = await res.json();
      document.getElementById("total-comprobantes").textContent = todasSeries.length;
      paginaActual = 1;
      renderTabla();
    } catch {
      document.getElementById("tabla-comprobantes").innerHTML =
        `<tr><td colspan="7" class="text-center text-danger">Error al cargar comprobantes.</td></tr>`;
    }
  }

  function seriesFiltradas() {
    const q = document.getElementById("buscador-comp").value.toLowerCase();
    const estado = document.getElementById("filtro-estado-comp").value;
    return todasSeries.filter(s => {
      const coincide = s.tipo_comprobante.toLowerCase().includes(q) || s.serie.toLowerCase().includes(q);
      const estadoOk = estado === "" || String(s.estado) === estado;
      return coincide && estadoOk;
    });
  }

  function renderTabla() {
    const filtradas = seriesFiltradas();
    const total = filtradas.length;
    const totalPaginas = Math.ceil(total / porPagina);
    const inicio = (paginaActual - 1) * porPagina;
    const pagina = filtradas.slice(inicio, inicio + porPagina);

    document.getElementById("info-paginacion-comp").textContent =
      `Mostrando ${pagina.length} de ${total} series`;

    const tbody = document.getElementById("tabla-comprobantes");
    if (pagina.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No se encontraron series.</td></tr>`;
    } else {
      tbody.innerHTML = pagina.map((s, i) => `
        <tr>
          <td>${inicio + i + 1}</td>
          <td><span class="fw-semibold">${s.tipo_comprobante}</span></td>
          <td><i class="ri-file-text-line me-1 text-muted"></i>${s.serie}</td>
          <td>${String(s.correlativo_actual).zfill(8)}</td>
          <td>${String(s.correlativo_actual + 1).zfill(8)}</td>
          <td>${s.estado == 1
            ? '<span class="badge bg-success-subtle text-success">Activo</span>'
            : '<span class="badge bg-danger-subtle text-danger">Inactivo</span>'}</td>
          <td class="text-center d-flex gap-1 justify-content-center">
            <button class="btn btn-sm btn-soft-primary" onclick="editarSerie(${s.id})" title="Editar">
              <i class="ri-edit-line"></i>
            </button>
            <button class="btn btn-sm btn-soft-danger" onclick="eliminarSerie(${s.id})" title="Desactivar">
              <i class="ri-close-circle-line"></i>
            </button>
          </td>
        </tr>`).join("");
    }

    const controles = document.getElementById("controles-paginacion-comp");
    controles.innerHTML = "";
    for (let p = 1; p <= totalPaginas; p++) {
      const btn = document.createElement("button");
      btn.className = `btn btn-sm ${p === paginaActual ? "btn-primary" : "btn-light"}`;
      btn.textContent = p;
      btn.onclick = () => { paginaActual = p; renderTabla(); };
      controles.appendChild(btn);
    }
  }

  // Extend String to pad leading zeros for matching standard numbering formats
  if (!String.prototype.zfill) {
    String.prototype.zfill = function (size) {
      var s = this;
      while (s.length < size) s = "0" + s;
      return s;
    };
  }

  function editarSerie(id) {
    const s = todasSeries.find(x => x.id === id);
    if (!s) return;

    modoEdicion = true;
    serieEditandoId = id;

    document.getElementById("comp_tipo").value = s.tipo_comprobante;
    document.getElementById("comp_serie").value = s.serie;
    document.getElementById("comp_correlativo").value = s.correlativo_actual;
    document.getElementById("comp_estado").value = s.estado;

    document.getElementById("btn-registrar-comp").innerHTML = '<i class="ri-save-line me-1"></i> Actualizar Serie';
    document.getElementById("btn-registrar-comp").className = "btn btn-warning fw-semibold px-4";
    document.getElementById("modalComprobanteLabel").textContent = "Actualizar Serie";

    getModalInstance().show();
  }

  function eliminarSerie(id) {
    serieEliminarId = id;
    const modalEl = document.getElementById("modalEliminarComp");
    modalEl.removeAttribute("aria-hidden");
    modalEliminarInstance = new bootstrap.Modal(modalEl);
    modalEliminarInstance.show();
  }

  function limpiarFormulario() {
    modoEdicion = false;
    serieEditandoId = null;
    document.getElementById("comp_tipo").value = "BOLETA";
    document.getElementById("comp_serie").value = "";
    document.getElementById("comp_correlativo").value = "0";
    document.getElementById("comp_estado").value = "1";
    document.getElementById("btn-registrar-comp").innerHTML = '<i class="ri-save-line me-1"></i> Registrar Serie';
    document.getElementById("btn-registrar-comp").className = "btn btn-primary fw-semibold px-4";
    document.getElementById("modalComprobanteLabel").textContent = "Registrar Nueva Serie";
  }

  function mostrarAlerta(mensaje, tipo) {
    document.getElementById("mensaje-alerta").innerHTML = `
      <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>`;
    setTimeout(() => document.getElementById("mensaje-alerta").innerHTML = "", 5000);
  }

  const btnRegistrar = document.getElementById("btn-registrar-comp");
  if (btnRegistrar) {
    btnRegistrar.onclick = async function () {
      const tipo_comprobante = document.getElementById("comp_tipo").value;
      const serie = document.getElementById("comp_serie").value.trim().toUpperCase();
      const correlativo_actual = parseInt(document.getElementById("comp_correlativo").value) || 0;
      const estado = parseInt(document.getElementById("comp_estado").value);

      if (!serie) {
        mostrarAlerta("La Serie es obligatoria.", "danger"); return;
      }
      if (correlativo_actual < 0) {
        mostrarAlerta("El correlativo debe ser mayor o igual a 0.", "danger"); return;
      }

      try {
        let res;
        if (modoEdicion) {
          res = await fetch(`/comprobante-series/${serieEditandoId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tipo_comprobante, serie, correlativo_actual, estado })
          });
        } else {
          res = await fetch("/comprobante-series/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tipo_comprobante, serie, correlativo_actual, estado })
          });
        }

        const data = await res.json();
        if (res.ok) {
          mostrarAlerta(modoEdicion ? "Serie actualizada correctamente." : "Serie registrada correctamente.", "success");
          limpiarFormulario();
          cargarComprobantes();
          getModalInstance().hide();
        } else {
          mostrarAlerta(data.detail || "Error al guardar.", "danger");
        }
      } catch {
        mostrarAlerta("Error de conexión.", "danger");
      }
    };
  }

  const btnNuevo = document.getElementById("btn-nuevo-comprobante");
  if (btnNuevo) {
    btnNuevo.onclick = function () {
      limpiarFormulario();
      getModalInstance().show();
    };
  }

  const btnLimpiar = document.getElementById("btn-limpiar-comp");
  if (btnLimpiar) {
    btnLimpiar.onclick = function () {
      limpiarFormulario();
    };
  }

  const btnConfirmarEliminar = document.getElementById("btn-confirmar-eliminar-comp");
  if (btnConfirmarEliminar) {
    btnConfirmarEliminar.onclick = async function () {
      if (modalEliminarInstance) modalEliminarInstance.hide();
      try {
        const res = await fetch(`/comprobante-series/${serieEliminarId}`, { method: "DELETE" });
        if (res.ok) { mostrarAlerta("Serie desactivada correctamente.", "success"); cargarComprobantes(); }
        else mostrarAlerta("Error al desactivar.", "danger");
      } catch {
        mostrarAlerta("Error de conexión.", "danger");
      }
    };
  }

  const buscador = document.getElementById("buscador-comp");
  if (buscador) {
    buscador.oninput = function () {
      paginaActual = 1; renderTabla();
    };
  }

  const filtroEstado = document.getElementById("filtro-estado-comp");
  if (filtroEstado) {
    filtroEstado.onchange = function () {
      paginaActual = 1; renderTabla();
    };
  }

  window.editarSerie = editarSerie;
  window.eliminarSerie = eliminarSerie;
  window.cargarComprobantes = cargarComprobantes;

  cargarComprobantes();
})();
