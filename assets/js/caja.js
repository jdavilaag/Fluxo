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

  function mostrarCajaAbierta() {
    document.getElementById("caja-estado").innerHTML = '<span class="badge bg-success-subtle text-success">Abierta</span>';
    document.getElementById("caja-fecha-apertura").textContent =
      new Date(cajaActiva.fecha_apertura).toLocaleString("es-PE");
    document.getElementById("caja-monto-apertura").textContent =
      `S/ ${parseFloat(cajaActiva.monto_apertura).toFixed(2)}`;

    document.getElementById("controles-caja").innerHTML = `
      <button class="btn btn-danger fw-semibold" id="btn-cerrar-caja">
        <i class="ri-lock-line me-1"></i> Cerrar Caja
      </button>`;

    document.getElementById("seccion-movimientos").style.display = "block";
  }

  function mostrarCajaCerrada() {
    document.getElementById("caja-estado").innerHTML = '<span class="badge bg-danger-subtle text-danger">Cerrada</span>';
    document.getElementById("caja-fecha-apertura").textContent = "-";
    document.getElementById("caja-monto-apertura").textContent = "S/ 0.00";

    document.getElementById("controles-caja").innerHTML = `
      <button class="btn btn-success fw-semibold" id="btn-abrir-caja">
        <i class="ri-lock-unlock-line me-1"></i> Abrir Caja
      </button>`;

    document.getElementById("seccion-movimientos").style.display = "none";
  }

  async function cargarMovimientos(cajaId) {
    try {
      const res = await fetch(`/caja/movimientos/${cajaId}`);
      const movimientos = await res.json();
      const tbody = document.getElementById("tabla-movimientos");

      if (movimientos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">Sin movimientos.</td></tr>`;
      } else {
        tbody.innerHTML = movimientos.map((m, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${m.tipo === "ingreso"
              ? '<span class="badge bg-success-subtle text-success">Ingreso</span>'
              : '<span class="badge bg-danger-subtle text-danger">Egreso</span>'}</td>
            <td>S/ ${parseFloat(m.monto).toFixed(2)}</td>
            <td>${m.descripcion || "-"}</td>
            <td>${m.fecha ? new Date(m.fecha).toLocaleString("es-PE") : "-"}</td>
          </tr>`).join("");
      }
    } catch {
      console.error("Error al cargar movimientos");
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
            <td>${c.estado === "abierta"
              ? '<span class="badge bg-success-subtle text-success">Abierta</span>'
              : '<span class="badge bg-secondary-subtle text-secondary">Cerrada</span>'}</td>
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

  document.addEventListener("click", async function (e) {
    // Abrir modal apertura
    if (e.target && (e.target.id === "btn-abrir-caja" || e.target.closest("#btn-abrir-caja"))) {
      document.getElementById("monto-apertura").value = "";
      const modalEl = document.getElementById("modalAbrirCaja");
      modalAbrirInstance = new bootstrap.Modal(modalEl);
      modalAbrirInstance.show();
    }

    // Confirmar apertura
    if (e.target && e.target.id === "btn-confirmar-apertura") {
      const monto = parseFloat(document.getElementById("monto-apertura").value);
      if (!monto || monto < 0) {
        mostrarAlerta("Ingrese un monto válido.", "danger"); return;
      }

      // Obtener usuario de la sesión
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
    }

    // Abrir modal cierre
    if (e.target && (e.target.id === "btn-cerrar-caja" || e.target.closest("#btn-cerrar-caja"))) {
    // Calcular total: monto apertura + total ventas
    try {
        const res = await fetch(`/caja/movimientos/${cajaActiva.id}`);
        const movimientos = await res.json();
        console.log("Movimientos:", movimientos); // ← agrega esto
        const totalVentas = movimientos
            .filter(m => m.tipo === "VENTA")
            .reduce((acc, m) => acc + m.monto, 0);
            console.log("Total ventas:", totalVentas); // ← y esto
            console.log("Tipos:", movimientos.map(m => m.tipo));
        const totalCierre = cajaActiva.monto_apertura + totalVentas;
        
        document.getElementById("monto-cierre").value = totalCierre.toFixed(2);
        document.getElementById("monto-cierre").readOnly = true; // ← no editable
        
        const modalEl = document.getElementById("modalCerrarCaja");
        modalCerrarInstance = new bootstrap.Modal(modalEl);
        modalCerrarInstance.show();
    } catch {
        mostrarAlerta("Error al calcular monto de cierre.", "danger");
    }
}

    // Confirmar cierre
    if (e.target && e.target.id === "btn-confirmar-cierre") {
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
    }
  });

  window.iniciarCaja = iniciarCaja;

  iniciarCaja();
})();