(function () {
  var todosMovimientos = [];
  var todosProductos = [];
  var paginaActual = 1;
  var porPagina = 10;

  async function cargarProductos() {
    try {
      const res = await fetch("/productos/");
      if (res.ok) {
        todosProductos = await res.json();
        const select = document.getElementById("filtro-producto-kardex");
        if (select) {
          select.innerHTML = '<option value="">Todos los productos</option>';
          todosProductos.forEach(p => {
            select.innerHTML += `<option value="${p.nombre_producto}">${p.nombre_producto}</option>`;
          });
        }
      }
    } catch (e) {
      console.error("Error al cargar productos para filtros:", e);
    }
  }

  async function cargarKardex() {
    try {
      const tabla = document.getElementById("tabla-kardex");
      if (tabla) {
        tabla.innerHTML = `
          <tr>
            <td colspan="9" class="text-center py-4 text-muted">
              <i class="ri-loader-4-line me-1"></i> Cargando movimientos...
            </td>
          </tr>`;
      }

      const res = await fetch("/kardex/");
      if (res.ok) {
        todosMovimientos = await res.json();
        const totalSpan = document.getElementById("total-kardex");
        if (totalSpan) {
          totalSpan.textContent = todosMovimientos.length;
        }
        paginaActual = 1;
        renderTabla();
      } else {
        throw new Error("Error al obtener los movimientos del servidor");
      }
    } catch (e) {
      const tabla = document.getElementById("tabla-kardex");
      if (tabla) {
        tabla.innerHTML = `<tr><td colspan="9" class="text-center text-danger">Error al cargar movimientos de stock.</td></tr>`;
      }
      mostrarAlerta("No se pudieron cargar los movimientos de stock del Kardex.", "danger");
    }
  }

  function movimientosFiltrados() {
    const prodEl = document.getElementById("filtro-producto-kardex");
    const tipoEl = document.getElementById("filtro-tipo-kardex");
    const desdeEl = document.getElementById("filtro-fecha-desde");
    const hastaEl = document.getElementById("filtro-fecha-hasta");
    const buscadorEl = document.getElementById("buscador-kardex");

    const prod = prodEl ? prodEl.value : "";
    const tipo = tipoEl ? tipoEl.value : "";
    const desde = desdeEl ? desdeEl.value : "";
    const hasta = hastaEl ? hastaEl.value : "";
    const q = buscadorEl ? buscadorEl.value.toLowerCase() : "";

    return todosMovimientos.filter(m => {
      const coincideProducto = prod === "" || m.producto === prod;
      let coincideTipo = false;
      if (tipo === "") {
        coincideTipo = true;
      } else {
        const mTipo = m.tipo_movimiento ? m.tipo_movimiento.toLowerCase() : "";
        if (tipo === "ingreso") {
          coincideTipo = (mTipo === "ingreso" || mTipo === "entrada");
        } else if (tipo === "salida") {
          coincideTipo = (mTipo === "salida");
        } else {
          coincideTipo = (mTipo === tipo.toLowerCase());
        }
      }

      // Extract date YYYY-MM-DD from fecha_registro
      const mFecha = m.fecha_registro ? m.fecha_registro.substring(0, 10) : "";
      const coincideDesde = desde === "" || mFecha >= desde;
      const coincideHasta = hasta === "" || mFecha <= hasta;

      const coincideBuscador = q === "" ||
        (m.producto && m.producto.toLowerCase().includes(q)) ||
        (m.observacion && m.observacion.toLowerCase().includes(q)) ||
        (m.usuario && m.usuario.toLowerCase().includes(q)) ||
        (m.tipo_movimiento && m.tipo_movimiento.toLowerCase().includes(q));

      return coincideProducto && coincideTipo && coincideDesde && coincideHasta && coincideBuscador;
    });
  }

  function renderTabla() {
    const filtrados = movimientosFiltrados();
    const total = filtrados.length;
    const totalPaginas = Math.ceil(total / porPagina);

    if (paginaActual > totalPaginas && totalPaginas > 0) {
      paginaActual = totalPaginas;
    }

    const inicio = (paginaActual - 1) * porPagina;
    const pagina = filtrados.slice(inicio, inicio + porPagina);

    const infoPaginacion = document.getElementById("info-paginacion-kardex");
    if (infoPaginacion) {
      infoPaginacion.textContent = `Mostrando ${pagina.length} de ${total} movimientos`;
    }

    const tbody = document.getElementById("tabla-kardex");
    if (!tbody) return;

    if (pagina.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">No se encontraron movimientos de Kardex.</td></tr>`;
    } else {
      tbody.innerHTML = pagina.map((m, i) => {
        let badgeTipo = "";
        const tipo = m.tipo_movimiento ? m.tipo_movimiento.toLowerCase() : "";
        if (tipo === "ingreso") {
          badgeTipo = '<span class="badge bg-success-subtle text-success"><i class="ri-arrow-left-down-line me-1"></i>Ingreso</span>';
        } else if (tipo === "salida") {
          badgeTipo = '<span class="badge bg-danger-subtle text-danger"><i class="ri-arrow-right-up-line me-1"></i>Salida</span>';
        } else {
          badgeTipo = `<span class="badge bg-secondary-subtle text-secondary">${m.tipo_movimiento}</span>`;
        }

        const fechaStr = m.fecha_registro ? new Date(m.fecha_registro).toLocaleString("es-PE") : "-";

        return `
          <tr>
            <td>${inicio + i + 1}</td>
            <td><span class="fw-medium">${m.producto}</span></td>
            <td>${badgeTipo}</td>
            <td><span class="fw-semibold">${m.cantidad}</span></td>
            <td>${m.stock_anterior}</td>
            <td><span class="text-primary fw-semibold">${m.stock_posterior}</span></td>
            <td><small class="text-muted">${m.observacion || "-"}</small></td>
            <td><i class="ri-user-line me-1 text-muted fs-12"></i>${m.usuario}</td>
            <td>${fechaStr}</td>
          </tr>`;
      }).join("");
    }

    const controles = document.getElementById("controles-paginacion-kardex");
    if (controles) {
      controles.innerHTML = "";
      if (totalPaginas > 1) {
        // Anterior
        const btnPrev = document.createElement("button");
        btnPrev.className = `btn btn-sm btn-light ${paginaActual === 1 ? "disabled" : ""}`;
        btnPrev.innerHTML = '<i class="ri-arrow-left-s-line"></i>';
        btnPrev.onclick = () => { if (paginaActual > 1) { paginaActual--; renderTabla(); } };
        controles.appendChild(btnPrev);

        // Numeros
        for (let p = 1; p <= totalPaginas; p++) {
          const btn = document.createElement("button");
          btn.className = `btn btn-sm ${p === paginaActual ? "btn-primary" : "btn-light"}`;
          btn.textContent = p;
          btn.onclick = () => { paginaActual = p; renderTabla(); };
          controles.appendChild(btn);
        }

        // Siguiente
        const btnNext = document.createElement("button");
        btnNext.className = `btn btn-sm btn-light ${paginaActual === totalPaginas ? "disabled" : ""}`;
        btnNext.innerHTML = '<i class="ri-arrow-right-s-line"></i>';
        btnNext.onclick = () => { if (paginaActual < totalPaginas) { paginaActual++; renderTabla(); } };
        controles.appendChild(btnNext);
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

  const buscador = document.getElementById("buscador-kardex");
  if (buscador) {
    buscador.oninput = function () {
      paginaActual = 1; renderTabla();
    };
  }

  const ids = ["filtro-producto-kardex", "filtro-tipo-kardex", "filtro-fecha-desde", "filtro-fecha-hasta"];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.onchange = function () {
        paginaActual = 1; renderTabla();
      };
    }
  });

  const btnFiltrar = document.getElementById("btn-filtrar-kardex");
  if (btnFiltrar) {
    btnFiltrar.onclick = function () {
      paginaActual = 1; renderTabla();
    };
  }

  // Expose global function
  window.cargarKardex = cargarKardex;

  // Initialize
  async function init() {
    await cargarProductos();
    await cargarKardex();
  }

  init();
})();
