(function () {
  var cajaActiva = null;
  var modalAbrirInstance = null;
  var modalCerrarInstance = null;

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
        mostrarCajaCerrada();
      }
    } catch {
      cajaActiva = null;
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
      console.log("Movimientos:", movimientos);
      const totalVentas = movimientos
          .filter(m => m.tipo === "VENTA")
          .reduce((acc, m) => acc + m.monto, 0);
      console.log("Total ventas:", totalVentas);
      const totalCierre = cajaActiva.monto_apertura + totalVentas;
      
      document.getElementById("monto-cierre").value = totalCierre.toFixed(2);
      document.getElementById("monto-cierre").readOnly = true;
      
      const modalEl = document.getElementById("modalCerrarCaja");
      modalCerrarInstance = new bootstrap.Modal(modalEl);
      modalCerrarInstance.show();
    } catch {
      mostrarAlerta("Error al calcular monto de cierre.", "danger");
    }
  }

  function mostrarCajaAbierta() {
    document.getElementById("caja-estado").innerHTML = '<span class="badge bg-success fs-12 px-2 py-1 mt-1">Abierta</span>';
    document.getElementById("caja-fecha-apertura").textContent =
      new Date(cajaActiva.fecha_apertura).toLocaleString("es-PE");
    document.getElementById("caja-monto-apertura").textContent =
      `S/ ${parseFloat(cajaActiva.monto_apertura).toFixed(2)}`;

    const wrapperMonto = document.getElementById("wrapper-monto-actual");
    if (wrapperMonto) wrapperMonto.style.display = "block";

    document.getElementById("controles-caja").innerHTML = `
      <button class="btn btn-danger fw-semibold" id="btn-cerrar-caja">
        <i class="ri-lock-line me-1"></i> Cerrar Caja
      </button>`;

    const btnCerrar = document.getElementById("btn-cerrar-caja");
    if (btnCerrar) {
      btnCerrar.onclick = cerrarCajaHandler;
    }

    document.getElementById("seccion-movimientos").style.display = "block";
  }

  function mostrarCajaCerrada() {
    document.getElementById("caja-estado").innerHTML = '<span class="badge bg-danger fs-12 px-2 py-1 mt-1">Cerrada</span>';
    document.getElementById("caja-fecha-apertura").textContent = "-";
    document.getElementById("caja-monto-apertura").textContent = "S/ 0.00";

    const wrapperMonto = document.getElementById("wrapper-monto-actual");
    if (wrapperMonto) wrapperMonto.style.display = "none";

    document.getElementById("controles-caja").innerHTML = `
      <button class="btn btn-success fw-semibold" id="btn-abrir-caja">
        <i class="ri-lock-unlock-line me-1"></i> Abrir Caja
      </button>`;

    const btnAbrir = document.getElementById("btn-abrir-caja");
    if (btnAbrir) {
      btnAbrir.onclick = abrirCajaHandler;
    }

    document.getElementById("seccion-movimientos").style.display = "none";
  }

  async function cargarMovimientos(cajaId) {
    try {
      const res = await fetch(`/caja/movimientos/${cajaId}`);
      const movimientos = await res.json();
      const tbody = document.getElementById("tabla-movimientos");

      // Calcular saldo estimado acumulado en tiempo real
      let totalIngresos = 0;
      let totalEgresos = 0;

      movimientos.forEach(m => {
        const tipoUpper = m.tipo.toUpperCase();
        // Venta e Ingreso suman saldo
        if (tipoUpper === "VENTA" || tipoUpper === "INGRESO") {
          totalIngresos += m.monto;
        } else if (tipoUpper === "EGRESO" || tipoUpper === "DEVOLUCION") {
          totalEgresos += m.monto;
        }
      });

      const montoInicial = cajaActiva ? parseFloat(cajaActiva.monto_apertura) : 0;
      const saldoActual = montoInicial + totalIngresos - totalEgresos;

      const elMontoActual = document.getElementById("caja-monto-actual");
      if (elMontoActual) {
        elMontoActual.textContent = `S/ ${saldoActual.toFixed(2)}`;
      }

      if (movimientos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">Sin movimientos.</td></tr>`;
      } else {
        tbody.innerHTML = movimientos.map((m, i) => {
          const tipoUpper = m.tipo.toUpperCase();
          const esIngreso = (tipoUpper === "VENTA" || tipoUpper === "INGRESO");
          const badgeHtml = esIngreso
            ? '<span class="badge bg-success-subtle text-success">Ingreso</span>'
            : '<span class="badge bg-danger-subtle text-danger">Egreso</span>';

          return `
            <tr>
              <td>${i + 1}</td>
              <td>${badgeHtml}</td>
              <td>S/ ${parseFloat(m.monto).toFixed(2)}</td>
              <td>${m.descripcion || "-"}</td>
              <td>${m.fecha ? new Date(m.fecha).toLocaleString("es-PE") : "-"}</td>
            </tr>`;
        }).join("");
      }
    } catch (e) {
      console.error("Error al cargar movimientos", e);
    }
  }

  async function cargarHistorial() {
    try {
      const res = await fetch("/caja/historial-detalle");
      const historial = await res.json();
      const tbody = document.getElementById("tabla-historial");

      if (historial.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">Sin historial.</td></tr>`;
      } else {
        tbody.innerHTML = historial.map((c, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${c.usuario}</td>
            <td>${c.fecha_apertura ? new Date(c.fecha_apertura).toLocaleString("es-PE") : "-"}</td>
            <td>${c.fecha_cierre ? new Date(c.fecha_cierre).toLocaleString("es-PE") : "-"}</td>
            <td>S/ ${parseFloat(c.monto_apertura).toFixed(2)}</td>
            <td>${c.monto_cierre ? `S/ ${parseFloat(c.monto_cierre).toFixed(2)}` : "-"}</td>
            <td>${(c.estado || "").toLowerCase() === "abierta"
              ? '<span class="badge bg-success">Abierta</span>'
              : '<span class="badge bg-danger">Cerrada</span>'}</td>
          </tr>`).join("");
      }
    } catch {
      console.error("Error al cargar historial");
    }
}

  function mostrarAlerta(mensaje, tipo) {
    document.getElementById("mensaje-alerta").innerHTML = `
      <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>`;
    setTimeout(() => document.getElementById("mensaje-alerta").innerHTML = "", 5000);
  }

  const btnConfirmarApertura = document.getElementById("btn-confirmar-apertura");
  if (btnConfirmarApertura) {
    btnConfirmarApertura.onclick = async function () {
      const monto = parseFloat(document.getElementById("monto-apertura").value);
      if (!monto || monto < 0) {
        mostrarAlerta("Ingrese un monto válido.", "danger"); return;
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
          mostrarAlerta("Caja abierta correctamente.", "success");
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
      if (!monto || monto < 0) {
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
          mostrarAlerta("Caja cerrada correctamente.", "success");
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

  iniciarCaja();
})();