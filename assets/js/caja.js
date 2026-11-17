(function () {
  var cajaActiva = null;
  var movimientosActivos = [];
  var historialCajas = [];
  var modalAbrirInstance = null;
  var modalCerrarInstance = null;
  var modalHistMovInstance = null;

  async function iniciarCaja() {
    await cargarCajaActiva();
    await cargarHistorial();
  }

  async function cargarCajaActiva() {
    try {
      const res = await fetch("/caja/activa");
      if (res.ok) {
        cajaActiva = await res.json();
        mostrarCajaAbierta();
        await cargarMovimientos(cajaActiva.id);
      } else {
        cajaActiva = null;
        movimientosActivos = [];
        mostrarCajaCerrada();
      }
    } catch {
      cajaActiva = null;
      movimientosActivos = [];
      mostrarCajaCerrada();
    }
  }

  function abrirCajaHandler() {
    document.getElementById("monto-apertura").value = "";
    const modalEl = document.getElementById("modalAbrirCaja");
    modalAbrirInstance = new bootstrap.Modal(modalEl);
    modalAbrirInstance.show();
  }

  async function cerrarCajaHandler() {
    try {
      const res = await fetch(`/caja/movimientos/${cajaActiva.id}`);
      const movimientos = await res.json();
      let totalIngresos = 0;
      let totalEgresos = 0;

      movimientos.forEach(m => {
        const tipoUpper = (m.tipo || "").toUpperCase();
        if (tipoUpper === "VENTA" || tipoUpper === "INGRESO") {
          totalIngresos += parseFloat(m.monto) || 0;
        } else if (tipoUpper === "EGRESO" || tipoUpper === "DEVOLUCION") {
          totalEgresos += parseFloat(m.monto) || 0;
        }
      });

      const apertura = parseFloat(cajaActiva.monto_apertura) || 0;
      const totalCierre = apertura + totalIngresos - totalEgresos;

      const elResApertura = document.getElementById("cierre-resumen-apertura");
      const elResIngresos = document.getElementById("cierre-resumen-ingresos");
      const elResEgresos = document.getElementById("cierre-resumen-egresos");
      const elResEsperado = document.getElementById("cierre-resumen-esperado");

      if (elResApertura) elResApertura.textContent = `S/ ${apertura.toFixed(2)}`;
      if (elResIngresos) elResIngresos.textContent = `+ S/ ${totalIngresos.toFixed(2)}`;
      if (elResEgresos) elResEgresos.textContent = `- S/ ${totalEgresos.toFixed(2)}`;
      if (elResEsperado) elResEsperado.textContent = `S/ ${totalCierre.toFixed(2)}`;

      document.getElementById("monto-cierre").value = totalCierre.toFixed(2);
      document.getElementById("monto-cierre").readOnly = true;

      const inputFisico = document.getElementById("arqueo-fisico-input");
      const boxDif = document.getElementById("arqueo-diferencia-box");
      if (inputFisico) inputFisico.value = totalCierre.toFixed(2);
      if (boxDif) boxDif.style.display = "none";

      const modalEl = document.getElementById("modalCerrarCaja");
      modalCerrarInstance = new bootstrap.Modal(modalEl);
      modalCerrarInstance.show();
    } catch {
      mostrarAlerta("Error al calcular monto de cierre.", "danger");
    }
  }

  function mostrarCajaAbierta() {
    document.getElementById("caja-estado").innerHTML = '<span class="badge bg-success-subtle text-success px-2 py-1"><i class="ri-checkbox-blank-circle-fill me-1 fs-10"></i>Abierta</span>';
    document.getElementById("caja-fecha-apertura").textContent =
      new Date(cajaActiva.fecha_apertura).toLocaleString("es-PE");
    document.getElementById("caja-monto-apertura").textContent =
      `S/ ${parseFloat(cajaActiva.monto_apertura).toFixed(2)}`;

    document.getElementById("controles-caja").innerHTML = `
      <button class="btn btn-danger fw-semibold px-3" id="btn-cerrar-caja">
        <i class="ri-lock-line me-1"></i> Arqueo y Cierre de Caja
      </button>`;

    const btnCerrar = document.getElementById("btn-cerrar-caja");
    if (btnCerrar) {
      btnCerrar.onclick = cerrarCajaHandler;
    }

    document.getElementById("seccion-movimientos").style.display = "block";
  }

  function mostrarCajaCerrada() {
    document.getElementById("caja-estado").innerHTML = '<span class="badge bg-danger-subtle text-danger px-2 py-1"><i class="ri-lock-fill me-1"></i>Cerrada</span>';
    document.getElementById("caja-fecha-apertura").textContent = "Sin turno activo";
    document.getElementById("caja-monto-apertura").textContent = "S/ 0.00";

    const elIng = document.getElementById("caja-total-ingresos");
    const elEgr = document.getElementById("caja-total-egresos");
    const elAct = document.getElementById("caja-monto-actual");
    const elCntIng = document.getElementById("caja-count-ingresos");
    const elCntEgr = document.getElementById("caja-count-egresos");

    if (elIng) elIng.textContent = "S/ 0.00";
    if (elEgr) elEgr.textContent = "S/ 0.00";
    if (elAct) elAct.textContent = "S/ 0.00";
    if (elCntIng) elCntIng.textContent = "0 operaciones";
    if (elCntEgr) elCntEgr.textContent = "0 salidas";

    document.getElementById("controles-caja").innerHTML = `
      <button class="btn btn-success fw-semibold px-3" id="btn-abrir-caja">
        <i class="ri-lock-unlock-line me-1"></i> Abrir Turno de Caja
      </button>`;

    const btnAbrir = document.getElementById("btn-abrir-caja");
    if (btnAbrir) {
      btnAbrir.onclick = abrirCajaHandler;
    }

    document.getElementById("seccion-movimientos").style.display = "none";
  }

  function formatBadgeMovimiento(tipo) {
    const t = (tipo || "").toUpperCase();
    if (t === "VENTA") {
      return '<span class="badge bg-success-subtle text-success px-2 py-1"><i class="ri-shopping-bag-3-line me-1"></i>Venta (+)</span>';
    }
    if (t === "INGRESO") {
      return '<span class="badge bg-info-subtle text-info px-2 py-1"><i class="ri-arrow-left-down-line me-1"></i>Ingreso (+)</span>';
    }
    if (t === "DEVOLUCION") {
      return '<span class="badge bg-warning-subtle text-warning px-2 py-1"><i class="ri-refund-2-line me-1"></i>Devolución (-)</span>';
    }
    return '<span class="badge bg-danger-subtle text-danger px-2 py-1"><i class="ri-arrow-right-up-line me-1"></i>Egreso (-)</span>';
  }

  function renderMovimientosActivos() {
    const tbody = document.getElementById("tabla-movimientos");
    if (!tbody) return;

    const q = (document.getElementById("buscador-mov-caja")?.value || "").toLowerCase();
    const filtroFlujo = document.getElementById("filtro-tipo-mov-caja")?.value || "";

    const filtrados = movimientosActivos.filter(m => {
      const tipoUpper = (m.tipo || "").toUpperCase();
      const esIngreso = (tipoUpper === "VENTA" || tipoUpper === "INGRESO");
      const coincideTexto = (m.descripcion || "").toLowerCase().includes(q) || tipoUpper.toLowerCase().includes(q);
      const coincideFlujo = filtroFlujo === "" ||
        (filtroFlujo === "INGRESO" && esIngreso) ||
        (filtroFlujo === "EGRESO" && !esIngreso);
      return coincideTexto && coincideFlujo;
    });

    if (filtrados.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No se encontraron movimientos con los filtros aplicados.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtrados.map((m, i) => {
      const tipoUpper = (m.tipo || "").toUpperCase();
      const esIngreso = (tipoUpper === "VENTA" || tipoUpper === "INGRESO");
      const signo = esIngreso ? "+" : "-";
      const colorClase = esIngreso ? "text-success" : "text-danger";

      return `
        <tr>
          <td>${i + 1}</td>
          <td>${formatBadgeMovimiento(tipoUpper)}</td>
          <td class="fw-medium text-dark">${m.descripcion || "-"}</td>
          <td class="text-muted">${m.fecha ? new Date(m.fecha).toLocaleString("es-PE") : "-"}</td>
          <td class="text-end fw-bold ${colorClase}">${signo} S/ ${parseFloat(m.monto).toFixed(2)}</td>
        </tr>`;
    }).join("");
  }

  async function cargarMovimientos(cajaId) {
    try {
      const res = await fetch(`/caja/movimientos/${cajaId}`);
      movimientosActivos = await res.json();

      let totalIngresos = 0;
      let totalEgresos = 0;
      let countIngresos = 0;
      let countEgresos = 0;

      movimientosActivos.forEach(m => {
        const tipoUpper = (m.tipo || "").toUpperCase();
        const monto = parseFloat(m.monto) || 0;
        if (tipoUpper === "VENTA" || tipoUpper === "INGRESO") {
          totalIngresos += monto;
          countIngresos++;
        } else if (tipoUpper === "EGRESO" || tipoUpper === "DEVOLUCION") {
          totalEgresos += monto;
          countEgresos++;
        }
      });

      const montoInicial = cajaActiva ? parseFloat(cajaActiva.monto_apertura) : 0;
      const saldoActual = montoInicial + totalIngresos - totalEgresos;

      const elIng = document.getElementById("caja-total-ingresos");
      const elEgr = document.getElementById("caja-total-egresos");
      const elAct = document.getElementById("caja-monto-actual");
      const elCntIng = document.getElementById("caja-count-ingresos");
      const elCntEgr = document.getElementById("caja-count-egresos");

      if (elIng) elIng.textContent = `S/ ${totalIngresos.toFixed(2)}`;
      if (elEgr) elEgr.textContent = `S/ ${totalEgresos.toFixed(2)}`;
      if (elAct) elAct.textContent = `S/ ${saldoActual.toFixed(2)}`;
      if (elCntIng) elCntIng.textContent = `${countIngresos} ${countIngresos === 1 ? "operación" : "operaciones"}`;
      if (elCntEgr) elCntEgr.textContent = `${countEgresos} ${countEgresos === 1 ? "salida" : "salidas"}`;

      renderMovimientosActivos();
    } catch (e) {
      console.error("Error al cargar movimientos", e);
    }
  }

  function renderHistorialCajas() {
    const tbody = document.getElementById("tabla-historial");
    if (!tbody) return;

    const q = (document.getElementById("buscador-historial-caja")?.value || "").toLowerCase();
    const filtrados = historialCajas.filter(c =>
      (c.usuario || "").toLowerCase().includes(q) ||
      (c.estado || "").toLowerCase().includes(q)
    );

    if (filtrados.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Sin registros en el historial.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtrados.map((c, i) => {
      const abierta = (c.estado || "").toLowerCase() === "abierta";
      const badgeEstado = abierta
        ? '<span class="badge bg-success-subtle text-success px-2 py-1">Abierta</span>'
        : '<span class="badge bg-secondary-subtle text-secondary px-2 py-1">Cerrada</span>';

      return `
        <tr>
          <td>${i + 1}</td>
          <td><i class="ri-user-3-line text-muted me-1"></i><span class="fw-semibold text-dark">${c.usuario}</span></td>
          <td>${c.fecha_apertura ? new Date(c.fecha_apertura).toLocaleString("es-PE") : "-"}</td>
          <td>${c.fecha_cierre ? new Date(c.fecha_cierre).toLocaleString("es-PE") : '<span class="text-muted fst-italic">En curso</span>'}</td>
          <td class="text-end">S/ ${parseFloat(c.monto_apertura).toFixed(2)}</td>
          <td class="text-end fw-bold text-dark">${c.monto_cierre !== null && c.monto_cierre !== undefined ? `S/ ${parseFloat(c.monto_cierre).toFixed(2)}` : "-"}</td>
          <td class="text-center">${badgeEstado}</td>
          <td class="text-center">
            <button class="btn btn-sm btn-soft-info" onclick="verMovimientos(${c.id})" title="Ver movimientos de este turno">
              <i class="ri-eye-line me-1"></i>Detalle
            </button>
          </td>
        </tr>`;
    }).join("");
  }

  async function cargarHistorial() {
    try {
      const res = await fetch("/caja/historial-detalle");
      historialCajas = await res.json();
      renderHistorialCajas();
    } catch {
      console.error("Error al cargar historial");
    }
  }

  async function verMovimientos(cajaId) {
    try {
      const res = await fetch(`/caja/movimientos/${cajaId}`);
      const movs = await res.json();
      const tbody = document.getElementById("tabla-modal-movimientos-hist");

      if (!movs || movs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No se registraron movimientos en este turno.</td></tr>`;
      } else {
        tbody.innerHTML = movs.map((m, i) => {
          const tipoUpper = (m.tipo || "").toUpperCase();
          const esIngreso = (tipoUpper === "VENTA" || tipoUpper === "INGRESO");
          const signo = esIngreso ? "+" : "-";
          const color = esIngreso ? "text-success" : "text-danger";
          return `
            <tr>
              <td>${i + 1}</td>
              <td>${formatBadgeMovimiento(tipoUpper)}</td>
              <td>${m.descripcion || "-"}</td>
              <td>${m.fecha ? new Date(m.fecha).toLocaleString("es-PE") : "-"}</td>
              <td class="text-end fw-bold ${color}">${signo} S/ ${parseFloat(m.monto).toFixed(2)}</td>
            </tr>`;
        }).join("");
      }

      const modalEl = document.getElementById("modalMovimientosHistorial");
      modalHistMovInstance = new bootstrap.Modal(modalEl);
      modalHistMovInstance.show();
    } catch {
      mostrarAlerta("Error al consultar los movimientos del turno.", "danger");
    }
  }

  function mostrarAlerta(mensaje, tipo) {
    document.getElementById("mensaje-alerta").innerHTML = `
      <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>`;
    setTimeout(() => {
      const el = document.getElementById("mensaje-alerta");
      if (el) el.innerHTML = "";
    }, 5000);
  }

  // Botones rápidos de apertura
  document.querySelectorAll(".btn-apertura-rapida").forEach(btn => {
    btn.addEventListener("click", function () {
      const val = parseFloat(this.getAttribute("data-val")) || 0;
      const input = document.getElementById("monto-apertura");
      if (input) input.value = val.toFixed(2);
    });
  });

  // Calculadora de diferencia de arqueo físico en vivo
  const inputArqueoFisico = document.getElementById("arqueo-fisico-input");
  if (inputArqueoFisico) {
    inputArqueoFisico.addEventListener("input", function () {
      const esperado = parseFloat(document.getElementById("monto-cierre").value) || 0;
      const fisico = parseFloat(this.value);
      const box = document.getElementById("arqueo-diferencia-box");
      const txt = document.getElementById("arqueo-diferencia-texto");

      if (isNaN(fisico)) {
        box.style.display = "none";
        return;
      }

      const dif = Math.round((fisico - esperado) * 100) / 100;
      box.style.display = "block";
      if (dif === 0) {
        txt.className = "p-2 rounded-3 text-center fw-semibold fs-13 bg-success-subtle text-success";
        txt.innerHTML = '<i class="ri-checkbox-circle-fill me-1"></i> Cuadre Exacto (Sin diferencias)';
      } else if (dif > 0) {
        txt.className = "p-2 rounded-3 text-center fw-semibold fs-13 bg-info-subtle text-info";
        txt.innerHTML = `<i class="ri-information-fill me-1"></i> Sobrante en caja: + S/ ${dif.toFixed(2)}`;
      } else {
        txt.className = "p-2 rounded-3 text-center fw-semibold fs-13 bg-danger-subtle text-danger";
        txt.innerHTML = `<i class="ri-error-warning-fill me-1"></i> Faltante en caja: - S/ ${Math.abs(dif).toFixed(2)}`;
      }
    });
  }

  // Filtros de movimientos e historial
  const buscadorMov = document.getElementById("buscador-mov-caja");
  if (buscadorMov) buscadorMov.oninput = renderMovimientosActivos;

  const filtroTipoMov = document.getElementById("filtro-tipo-mov-caja");
  if (filtroTipoMov) filtroTipoMov.onchange = renderMovimientosActivos;

  const buscadorHist = document.getElementById("buscador-historial-caja");
  if (buscadorHist) buscadorHist.oninput = renderHistorialCajas;

  const btnConfirmarApertura = document.getElementById("btn-confirmar-apertura");
  if (btnConfirmarApertura) {
    btnConfirmarApertura.onclick = async function () {
      const monto = parseFloat(document.getElementById("monto-apertura").value);
      if (isNaN(monto) || monto < 0) {
        mostrarAlerta("Ingrese un monto de apertura válido.", "danger"); return;
      }

      try {
        const res = await fetch("/auth/sesion");
        const sesion = await res.json();

        const resCaja = await fetch("/caja/abrir", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ monto_apertura: monto, usuario_id: sesion.id })
        });

        const data = await resCaja.json();
        if (resCaja.ok) {
          if (modalAbrirInstance) modalAbrirInstance.hide();
          mostrarAlerta("Turno de caja iniciado correctamente.", "success");
          await iniciarCaja();
        } else {
          mostrarAlerta(data.detail || "Error al abrir caja.", "danger");
        }
      } catch {
        mostrarAlerta("Error de conexión.", "danger");
      }
    };
  }

  const btnConfirmarCierre = document.getElementById("btn-confirmar-cierre");
  if (btnConfirmarCierre) {
    btnConfirmarCierre.onclick = async function () {
      const monto = parseFloat(document.getElementById("monto-cierre").value);
      if (isNaN(monto) || monto < 0) {
        mostrarAlerta("Ingrese un monto válido.", "danger"); return;
      }

      try {
        const res = await fetch(`/caja/cerrar/${cajaActiva.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ monto_cierre: monto })
        });

        const data = await res.json();
        if (res.ok) {
          if (modalCerrarInstance) modalCerrarInstance.hide();
          mostrarAlerta("Caja cerrada y arqueada correctamente.", "success");
          await iniciarCaja();
        } else {
          mostrarAlerta(data.detail || "Error al cerrar caja.", "danger");
        }
      } catch {
        mostrarAlerta("Error de conexión.", "danger");
      }
    };
  }

  window.iniciarCaja = iniciarCaja;
  window.verMovimientos = verMovimientos;

  iniciarCaja();
})();
