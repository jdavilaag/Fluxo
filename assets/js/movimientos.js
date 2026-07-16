(function () {
  var todosMovimientos = [];
  var todosProductos = [];
  var paginaActual = 1;
  var porPagina = 10;

  async function cargarProductosFiltro() {
    try {
      const res = await fetch("/productos/");
      if (res.ok) {
        todosProductos = await res.json();
        const select = document.getElementById("filtro-producto-mov");
        if (select) {
          select.innerHTML = '<option value="">Todos los productos</option>' +
            todosProductos.map(p => `<option value="${p.nombre_producto}">${p.nombre_producto}</option>`).join("");
        }
      }
    } catch (e) {
      console.error("Error al cargar productos para filtros:", e);
    }
  }

  async function cargarMovimientos() {
    try {
      const tbody = document.getElementById("tabla-movimientos");
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="10" class="text-center py-4 text-muted">
              <i class="ri-loader-4-line me-1"></i> Cargando movimientos de stock...
            </td>
          </tr>`;
      }

      const res = await fetch("/auth/movimientos");
      if (res.ok) {
        todosMovimientos = await res.json();
        paginaActual = 1;
        renderTabla();
      } else {
        throw new Error("Error al obtener los movimientos del servidor");
      }
    } catch (e) {
      const tbody = document.getElementById("tabla-movimientos");
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center text-danger">Error al cargar movimientos de stock.</td></tr>`;
      }
    }
  }

  function movimientosFiltrados() {
    const prodEl = document.getElementById("filtro-producto-mov");
    const tipoEl = document.getElementById("filtro-tipo-mov");
    const refEl = document.getElementById("filtro-ref-mov");
    const desdeEl = document.getElementById("filtro-fecha-desde-mov");
    const hastaEl = document.getElementById("filtro-fecha-hasta-mov");
    const buscadorEl = document.getElementById("buscador-movimientos");

    const prod = prodEl ? prodEl.value : "";
    const tipo = tipoEl ? tipoEl.value : "";
    const ref = refEl ? refEl.value : "";
    const desde = desdeEl ? desdeEl.value : "";
    const hasta = hastaEl ? hastaEl.value : "";
    const q = buscadorEl ? buscadorEl.value.toLowerCase() : "";

    return todosMovimientos.filter(m => {
      // 1. Producto
      const coincideProducto = prod === "" || m.producto === prod;
      
      // 2. Tipo Movimiento (ENTRADA, SALIDA)
      const coincideTipo = tipo === "" || m.tipo_movimiento === tipo;
      
      // 3. Origen/Referencia (INGRESO, VENTA, DEVOLUCION, AJUSTE)
      const coincideRef = ref === "" || m.referencia_tipo === ref;

      // 4. Fechas (YYYY-MM-DD)
      const mFecha = m.fecha_registro ? m.fecha_registro.substring(0, 10) : "";
      const coincideDesde = desde === "" || mFecha >= desde;
      const coincideHasta = hasta === "" || mFecha <= hasta;

      // 5. Buscador de texto
      const coincideBuscador = q === "" ||
        (m.producto && m.producto.toLowerCase().includes(q)) ||
        (m.observacion && m.observacion.toLowerCase().includes(q)) ||
        (m.usuario && m.usuario.toLowerCase().includes(q)) ||
        (m.referencia_nro && m.referencia_nro.toLowerCase().includes(q)) ||
        (m.lote && m.lote.toLowerCase().includes(q));

      return coincideProducto && coincideTipo && coincideRef && coincideDesde && coincideHasta && coincideBuscador;
    });
  }

  function calcularEstadisticas(filtrados) {
    let entradas = 0;
    let salidas = 0;
    let ajustesCount = 0;
    
    filtrados.forEach(m => {
      if (m.tipo_movimiento === "ENTRADA") {
        entradas += m.cantidad;
      } else if (m.tipo_movimiento === "SALIDA") {
        salidas += m.cantidad;
      }
      
      if (m.referencia_tipo === "AJUSTE" || m.tipo_movimiento === "AJUSTE") {
        ajustesCount++;
      }
    });

    document.getElementById("stat-total-entradas").textContent = entradas.toFixed(2);
    document.getElementById("stat-total-salidas").textContent = salidas.toFixed(2);
    document.getElementById("stat-total-ajustes").textContent = ajustesCount;
    document.getElementById("stat-total-registros").textContent = filtrados.length;
  }

  function renderTabla() {
    const filtrados = movimientosFiltrados();
    
    // Recalcular estadísticas del panel
    calcularEstadisticas(filtrados);

    const total = filtrados.length;
    const totalPaginas = Math.ceil(total / porPagina);

    if (paginaActual > totalPaginas && totalPaginas > 0) {
      paginaActual = totalPaginas;
    }

    const inicio = (paginaActual - 1) * porPagina;
    const pagina = filtrados.slice(inicio, inicio + porPagina);

    const infoPaginacion = document.getElementById("info-paginacion-movimientos");
    if (infoPaginacion) {
      infoPaginacion.textContent = `Mostrando ${pagina.length} de ${total} movimientos`;
    }

    const tbody = document.getElementById("tabla-movimientos");
    if (!tbody) return;

    if (pagina.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-muted">No se encontraron movimientos de stock.</td></tr>`;
    } else {
      tbody.innerHTML = pagina.map((m, i) => {
        let badgeTipo = "";
        if (m.tipo_movimiento === "ENTRADA") {
          badgeTipo = '<span class="badge bg-success-subtle text-success"><i class="ri-arrow-left-down-line me-1"></i>ENTRADA</span>';
        } else if (m.tipo_movimiento === "SALIDA") {
          badgeTipo = '<span class="badge bg-danger-subtle text-danger"><i class="ri-arrow-right-up-line me-1"></i>SALIDA</span>';
        } else {
          badgeTipo = `<span class="badge bg-secondary-subtle text-secondary">${m.tipo_movimiento}</span>`;
        }

        let refIcon = "ri-file-text-line";
        if (m.referencia_tipo === "VENTA") {
          refIcon = "ri-shopping-cart-2-line";
        } else if (m.referencia_tipo === "INGRESO") {
          refIcon = "ri-download-2-line";
        } else if (m.referencia_tipo === "DEVOLUCION") {
          refIcon = "ri-refund-2-line";
        } else if (m.referencia_tipo === "AJUSTE") {
          refIcon = "ri-equalizer-line";
        }

        const fechaStr = m.fecha_registro ? new Date(m.fecha_registro).toLocaleString("es-PE") : "-";

        return `
          <tr>
            <td>${inicio + i + 1}</td>
            <td>${fechaStr}</td>
            <td><span class="fw-semibold text-dark">${m.producto}</span></td>
            <td><span class="badge bg-light text-dark fs-12">${m.lote}</span></td>
            <td>${badgeTipo}</td>
            <td>
              <span class="text-dark fw-medium">
                <i class="${refIcon} me-1 text-muted fs-13"></i>${m.referencia_nro}
              </span>
            </td>
            <td class="text-center fw-bold text-dark">${m.cantidad}</td>
            <td class="text-center">
              <small class="text-muted">${m.stock_anterior}</small>
              <i class="ri-arrow-right-line mx-1 text-muted"></i>
              <span class="text-primary fw-semibold">${m.stock_posterior}</span>
            </td>
            <td><i class="ri-user-line me-1 text-muted fs-11"></i>${m.usuario}</td>
            <td><span class="text-muted fs-13" title="${m.observacion}">${m.observacion}</span></td>
          </tr>`;
      }).join("");
    }

    const controles = document.getElementById("controles-paginacion-movimientos");
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

  function limpiarFiltros() {
    const ids = ["filtro-producto-mov", "filtro-tipo-mov", "filtro-ref-mov", "filtro-fecha-desde-mov", "filtro-fecha-hasta-mov", "buscador-movimientos"];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    paginaActual = 1;
    renderTabla();
  }

  // Event hookups
  const btnLimpiar = document.getElementById("btn-limpiar-filtros-mov");
  if (btnLimpiar) {
    btnLimpiar.onclick = limpiarFiltros;
  }

  const buscador = document.getElementById("buscador-movimientos");
  if (buscador) {
    buscador.oninput = function () {
      paginaActual = 1; renderTabla();
    };
  }

  const filterIds = ["filtro-producto-mov", "filtro-tipo-mov", "filtro-ref-mov", "filtro-fecha-desde-mov", "filtro-fecha-hasta-mov"];
  filterIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.onchange = function () {
        paginaActual = 1; renderTabla();
      };
    }
  });

  // Expose global function
  window.cargarMovimientos = cargarMovimientos;

  // Init
  async function init() {
    await cargarProductosFiltro();
    await cargarMovimientos();
  }

  init();
})();
