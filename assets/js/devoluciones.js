(function () {
  var todasDevoluciones = [];
  var paginaActual = 1;
  var porPagina = 8;
  var modalDevolucionInstance = null;
  var modalVerDevolucionInstance = null;
  var modalAnularDevolucionInstance = null;
  
  var seleccionDocumentoItems = []; // Almacena ítems del documento origen seleccionado
  var devolucionAnularId = null;

  function getModalDevolucionInstance() {
    if (!modalDevolucionInstance) {
      modalDevolucionInstance = new bootstrap.Modal(document.getElementById("modalDevolucion"));
    }
    return modalDevolucionInstance;
  }

  function getModalVerDevolucionInstance() {
    if (!modalVerDevolucionInstance) {
      modalVerDevolucionInstance = new bootstrap.Modal(document.getElementById("modalVerDevolucion"));
    }
    return modalVerDevolucionInstance;
  }

  function getModalAnularDevolucionInstance() {
    if (!modalAnularDevolucionInstance) {
      modalAnularDevolucionInstance = new bootstrap.Modal(document.getElementById("modalAnularDevolucion"));
    }
    return modalAnularDevolucionInstance;
  }

  async function cargarDevoluciones() {
    try {
      const res = await fetch("/auth/devoluciones");
      if (res.ok) {
        todasDevoluciones = await res.json();
        document.getElementById("total-devoluciones").textContent = todasDevoluciones.length;
        paginaActual = 1;
        renderTabla();
      } else {
        document.getElementById("tabla-devoluciones").innerHTML =
          `<tr><td colspan="8" class="text-center text-danger">Error al cargar devoluciones.</td></tr>`;
      }
    } catch {
      document.getElementById("tabla-devoluciones").innerHTML =
        `<tr><td colspan="8" class="text-center text-danger">Error al cargar devoluciones.</td></tr>`;
    }
  }

  function devolucionesFiltradas() {
    const q = document.getElementById("buscador-devoluciones").value.toLowerCase();
    const tipo = document.getElementById("filtro-tipo").value;
    
    return todasDevoluciones.filter(d => {
      const coincideBusqueda = 
        d.motivo.toLowerCase().includes(q) || 
        d.nro_comprobante.toLowerCase().includes(q) ||
        d.nombre_usuario.toLowerCase().includes(q);
      const coincideTipo = tipo === "" || d.tipo_devolucion === tipo;
      return coincideBusqueda && coincideTipo;
    });
  }

  function renderTabla() {
    const filtradas = devolucionesFiltradas();
    const total = filtradas.length;
    const totalPaginas = Math.ceil(total / porPagina);
    const inicio = (paginaActual - 1) * porPagina;
    const pagina = filtradas.slice(inicio, inicio + porPagina);

    document.getElementById("info-paginacion-devoluciones").textContent =
      `Mostrando ${pagina.length} de ${total} devoluciones`;

    const tbody = document.getElementById("tabla-devoluciones");
    if (pagina.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No se encontraron devoluciones.</td></tr>`;
    } else {
      tbody.innerHTML = pagina.map((d, i) => {
        let badgeTipo = d.tipo_devolucion === "VENTA" 
          ? '<span class="badge bg-primary-subtle text-primary">VENTA (Cliente)</span>'
          : '<span class="badge bg-purple-subtle text-purple">COMPRA (Proveedor)</span>';
        
        let badgeEstado = d.estado === "REGISTRADO"
          ? '<span class="badge bg-success-subtle text-success">Registrado</span>'
          : '<span class="badge bg-danger-subtle text-danger">Anulado</span>';

        let btnAnular = d.estado === "REGISTRADO"
          ? `<button class="btn btn-sm btn-soft-danger" onclick="confirmarAnularDevolucion(${d.id})" title="Anular Devolución">
               <i class="ri-close-circle-line"></i>
             </button>`
          : '';

        return `
        <tr>
          <td>${inicio + i + 1}</td>
          <td>${d.fecha_registro ? new Date(d.fecha_registro).toLocaleString("es-PE") : "-"}</td>
          <td>${badgeTipo}</td>
          <td><strong>${d.nro_comprobante}</strong></td>
          <td>${d.nombre_usuario}</td>
          <td>${d.motivo}</td>
          <td>${badgeEstado}</td>
          <td class="text-center">
            <div class="d-flex gap-1 justify-content-center">
              <button class="btn btn-sm btn-soft-info" onclick="verDetalleDevolucion(${d.id})" title="Ver Detalle">
                <i class="ri-eye-line"></i>
              </button>
              ${btnAnular}
            </div>
          </td>
        </tr>`;
      }).join("");
    }

    const controles = document.getElementById("controles-paginacion-devoluciones");
    controles.innerHTML = "";
    for (let p = 1; p <= totalPaginas; p++) {
      const btn = document.createElement("button");
      btn.className = `btn btn-sm ${p === paginaActual ? "btn-primary" : "btn-light"}`;
      btn.textContent = p;
      btn.onclick = () => { paginaActual = p; renderTabla(); };
      controles.appendChild(btn);
    }
  }

  async function verDetalleDevolucion(id) {
    try {
      const res = await fetch(`/auth/devoluciones/${id}`);
      if (res.ok) {
        const d = await res.json();
        document.getElementById("det-id").textContent = d.id;
        document.getElementById("det-tipo").innerHTML = d.tipo_devolucion === "VENTA" 
          ? '<span class="badge bg-primary">VENTA (Cliente)</span>'
          : '<span class="badge bg-purple">COMPRA (Proveedor)</span>';
        document.getElementById("det-referencia").textContent = d.nro_comprobante;
        document.getElementById("det-usuario").textContent = d.nombre_usuario;
        document.getElementById("det-fecha").textContent = d.fecha_registro ? new Date(d.fecha_registro).toLocaleString("es-PE") : "-";
        document.getElementById("det-motivo").textContent = d.motivo;
        document.getElementById("det-estado").innerHTML = d.estado === "REGISTRADO"
          ? '<span class="badge bg-success">Registrado</span>'
          : '<span class="badge bg-danger">Anulado</span>';

        const tbody = document.getElementById("tabla-detalles-items");
        let totalSuma = 0;
        
        tbody.innerHTML = d.items.map(item => {
          let sub = item.cantidad * item.precio_unitario;
          totalSuma += sub;
          return `
            <tr>
              <td>${item.nombre_producto}</td>
              <td><span class="badge bg-light text-dark">${item.nro_lote}</span></td>
              <td class="text-center font-medium">${item.cantidad}</td>
              <td class="text-end">S/. ${item.precio_unitario.toFixed(2)}</td>
              <td class="text-end fw-semibold text-dark">S/. ${sub.toFixed(2)}</td>
            </tr>
          `;
        }).join("");

        document.getElementById("det-total-suma").textContent = `S/. ${totalSuma.toFixed(2)}`;
        getModalVerDevolucionInstance().show();
      } else {
        alert("Error al cargar los detalles de la devolución.");
      }
    } catch {
      alert("Error de conexión al cargar los detalles.");
    }
  }

  function confirmarAnularDevolucion(id) {
    devolucionAnularId = id;
    getModalAnularDevolucionInstance().show();
  }

  const btnConfirmarAnular = document.getElementById("btn-confirmar-anular-devolucion");
  if (btnConfirmarAnular) {
    btnConfirmarAnular.onclick = async function () {
      getModalAnularDevolucionInstance().hide();
      try {
        const res = await fetch(`/auth/devoluciones/${devolucionAnularId}/anular`, {
          method: "POST"
        });
        const data = await res.json();
        if (res.ok) {
          mostrarAlertaDevolucion("Devolución anulada correctamente y stock restaurado.", "success");
          cargarDevoluciones();
        } else {
          mostrarAlertaDevolucion(data.detail || "Error al anular la devolución.", "danger");
        }
      } catch {
        mostrarAlertaDevolucion("Error de conexión al anular.", "danger");
      }
    };
  }

  // Lógica del Formulario de Creación de Devolución
  const devTipo = document.getElementById("dev_tipo");
  if (devTipo) {
    devTipo.onchange = async function () {
      const tipo = this.value;
      const docSelect = document.getElementById("dev_documento");
      
      // Reset
      docSelect.innerHTML = '<option value="">Cargando documentos...</option>';
      docSelect.disabled = true;
      document.getElementById("seccion-items-devolucion").style.display = "none";
      document.getElementById("btn-registrar-devolucion").disabled = true;
      seleccionDocumentoItems = [];

      if (!tipo) {
        docSelect.innerHTML = '<option value="">Seleccione primero el tipo...</option>';
        return;
      }

      try {
        const res = await fetch(`/auth/devoluciones/documentos/${tipo}`);
        if (res.ok) {
          const docs = await res.json();
          if (docs.length === 0) {
            docSelect.innerHTML = '<option value="">No hay documentos activos disponibles</option>';
          } else {
            docSelect.innerHTML = '<option value="">Seleccione el documento de origen</option>' +
              docs.map(d => `<option value="${d.id}">${d.nro_comprobante} - S/. ${d.total.toFixed(2)} (${new Date(d.fecha).toLocaleDateString("es-PE")})</option>`).join("");
            docSelect.disabled = false;
          }
        } else {
          docSelect.innerHTML = '<option value="">Error al cargar documentos</option>';
        }
      } catch {
        docSelect.innerHTML = '<option value="">Error de conexión</option>';
      }
    };
  }

  const devDocumento = document.getElementById("dev_documento");
  if (devDocumento) {
    devDocumento.onchange = async function () {
      const id = this.value;
      const tipo = document.getElementById("dev_tipo").value;
      const tbody = document.getElementById("tabla-items-devolucion");
      const seccionItems = document.getElementById("seccion-items-devolucion");
      
      // Reset
      tbody.innerHTML = "";
      seccionItems.style.display = "none";
      document.getElementById("btn-registrar-devolucion").disabled = true;
      seleccionDocumentoItems = [];

      if (!id) return;

      try {
        const res = await fetch(`/auth/devoluciones/documentos/${tipo}/${id}/detalle`);
        if (res.ok) {
          seleccionDocumentoItems = await res.json();
          if (seleccionDocumentoItems.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-warning">El documento no contiene artículos válidos.</td></tr>';
          } else {
            tbody.innerHTML = seleccionDocumentoItems.map((item, idx) => `
              <tr>
                <td>${item.nombre_producto}</td>
                <td><span class="badge bg-light text-dark">${item.nro_lote}</span></td>
                <td class="text-center font-medium">${item.cantidad}</td>
                <td class="text-center">
                  <input type="number" class="form-control form-control-sm text-center input-cant-dev" 
                         value="0" min="0" max="${item.cantidad}" step="1" 
                         data-idx="${idx}" oninput="validarYCalcularDevolucion(this)">
                </td>
                <td class="text-end">S/. ${item.precio_unitario.toFixed(2)}</td>
                <td class="text-end fw-semibold text-muted" id="subtotal-dev-${idx}">S/. 0.00</td>
              </tr>
            `).join("");
            seccionItems.style.display = "block";
          }
        } else {
          tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error al cargar el detalle del documento.</td></tr>';
          seccionItems.style.display = "block";
        }
      } catch {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error de conexión.</td></tr>';
        seccionItems.style.display = "block";
      }
    };
  }

  // Valida inputs y actualiza subtotales
  window.validarYCalcularDevolucion = function (input) {
    const idx = parseInt(input.getAttribute("data-idx"));
    const val = parseFloat(input.value) || 0;
    const item = seleccionDocumentoItems[idx];
    
    // Validar límites
    if (val < 0) input.value = 0;
    if (val > item.cantidad) input.value = item.cantidad;
    
    const cantidadFinal = parseFloat(input.value) || 0;
    const subtotal = cantidadFinal * item.precio_unitario;
    
    const subLabel = document.getElementById(`subtotal-dev-${idx}`);
    if (subLabel) {
      subLabel.textContent = `S/. ${subtotal.toFixed(2)}`;
      if (cantidadFinal > 0) {
        subLabel.className = "text-end fw-semibold text-success";
      } else {
        subLabel.className = "text-end fw-semibold text-muted";
      }
    }
    
    comprobarFormularioValido();
  };

  function comprobarFormularioValido() {
    const motivo = document.getElementById("dev_motivo").value.trim();
    let totalCantidadADevolver = 0;
    
    document.querySelectorAll(".input-cant-dev").forEach(input => {
      totalCantidadADevolver += parseFloat(input.value) || 0;
    });

    const valido = (motivo.length > 0) && (totalCantidadADevolver > 0);
    document.getElementById("btn-registrar-devolucion").disabled = !valido;
  }

  const devMotivo = document.getElementById("dev_motivo");
  if (devMotivo) {
    devMotivo.oninput = function () {
      comprobarFormularioValido();
    };
  }

  const btnRegistrarDevolucion = document.getElementById("btn-registrar-devolucion");
  if (btnRegistrarDevolucion) {
    btnRegistrarDevolucion.onclick = async function () {
      const tipo = document.getElementById("dev_tipo").value;
      const docId = parseInt(document.getElementById("dev_documento").value);
      const motivo = document.getElementById("dev_motivo").value.trim();
      
      const items = [];
      document.querySelectorAll(".input-cant-dev").forEach(input => {
        const idx = parseInt(input.getAttribute("data-idx"));
        const cantidad = parseFloat(input.value) || 0;
        if (cantidad > 0) {
          const orig = seleccionDocumentoItems[idx];
          items.push({
            producto_id: orig.producto_id,
            lote_id: orig.lote_id,
            cantidad: cantidad,
            precio_unitario: orig.precio_unitario
          });
        }
      });

      if (items.length === 0 || !motivo) return;

      const payload = {
        tipo_devolucion: tipo,
        motivo: motivo,
        items: items
      };

      if (tipo === "VENTA") {
        payload.venta_hdr_id = docId;
      } else {
        payload.ingreso_hdr_id = docId;
      }

      try {
        const res = await fetch("/auth/devoluciones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          mostrarAlertaDevolucion("Devolución registrada correctamente.", "success");
          limpiarFormularioDevolucion();
          cargarDevoluciones();
          getModalDevolucionInstance().hide();
        } else {
          mostrarAlertaDevolucion(data.detail || "Error al registrar la devolución.", "danger");
        }
      } catch {
        mostrarAlertaDevolucion("Error de conexión al enviar la devolución.", "danger");
      }
    };
  }

  function limpiarFormularioDevolucion() {
    document.getElementById("dev_tipo").value = "";
    const docSelect = document.getElementById("dev_documento");
    docSelect.innerHTML = '<option value="">Seleccione primero el tipo...</option>';
    docSelect.disabled = true;
    document.getElementById("dev_motivo").value = "";
    document.getElementById("seccion-items-devolucion").style.display = "none";
    document.getElementById("tabla-items-devolucion").innerHTML = "";
    document.getElementById("btn-registrar-devolucion").disabled = true;
    seleccionDocumentoItems = [];
  }

  function mostrarAlertaDevolucion(mensaje, tipo) {
    const alertContainer = document.getElementById("mensaje-alerta-devolucion") || document.getElementById("mensaje-alerta-rol") || document.getElementById("mensaje-alerta-permisos");
    if (alertContainer) {
      alertContainer.innerHTML = `
        <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
          ${mensaje}
          <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>`;
      setTimeout(() => alertContainer.innerHTML = "", 6000);
    } else {
      alert(mensaje);
    }
  }

  const btnLimpiar = document.getElementById("btn-limpiar-devolucion");
  if (btnLimpiar) {
    btnLimpiar.onclick = function () {
      limpiarFormularioDevolucion();
    };
  }

  const btnNuevaDev = document.getElementById("btn-nueva-devolucion");
  if (btnNuevaDev) {
    btnNuevaDev.onclick = function () {
      limpiarFormularioDevolucion();
      getModalDevolucionInstance().show();
    };
  }

  const buscador = document.getElementById("buscador-devoluciones");
  if (buscador) {
    buscador.oninput = function () {
      paginaActual = 1;
      renderTabla();
    };
  }

  const filtroTipo = document.getElementById("filtro-tipo");
  if (filtroTipo) {
    filtroTipo.onchange = function () {
      paginaActual = 1;
      renderTabla();
    };
  }

  // Export functions globally
  window.verDetalleDevolucion = verDetalleDevolucion;
  window.confirmarAnularDevolucion = confirmarAnularDevolucion;
  window.cargarDevoluciones = cargarDevoluciones;

  cargarDevoluciones();
  limpiarFormularioDevolucion();
})();
