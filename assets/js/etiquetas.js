(function () {
  "use strict";

  var todosProductos = [];
  var todasCategorias = [];
  var colaEtiquetas = [];
  var productoPreviewActual = null;
  var paginaActualEtq = 1;
  var porPaginaEtq = 10;

  function asegurarLibreriasCodigos() {
    var promesas = [];
    if (typeof window.JsBarcode === "undefined") {
      promesas.push(new Promise(function (resolve) {
        var s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js";
        s.onload = resolve;
        s.onerror = resolve;
        document.head.appendChild(s);
      }));
    }
    if (typeof window.QRCode === "undefined") {
      promesas.push(new Promise(function (resolve) {
        var s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js";
        s.onload = resolve;
        s.onerror = resolve;
        document.head.appendChild(s);
      }));
    }
    return Promise.all(promesas);
  }

  function mostrarAlertaEtq(mensaje, tipo) {
    var cont = document.getElementById("etq-alerta-container");
    if (!cont) return;
    cont.innerHTML =
      '<div class="alert alert-' + tipo + ' alert-dismissible fade show py-2 px-3 mb-3" role="alert">' +
        mensaje +
        '<button type="button" class="btn-close py-2" data-bs-dismiss="alert"></button>' +
      '</div>';
    setTimeout(function () {
      if (cont) cont.innerHTML = "";
    }, 6000);
  }

  function obtenerNombreCategoria(catId) {
    var cat = todasCategorias.find(function (c) { return c.id === catId; });
    return cat ? cat.nombre_categoria : "General";
  }

  function construirSkuAutomatico(prod) {
    var nomCat = obtenerNombreCategoria(prod.categoria_id)
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();
    var prefijo = (nomCat.slice(0, 3) || "PRD").padEnd(3, "X");
    var correlativo = String(prod.id).padStart(5, "0");
    return prefijo + "-" + correlativo;
  }

  function actualizarKPIs() {
    var activos = todosProductos.filter(function (p) { return p.estado === 1; });
    var conCodigo = activos.filter(function (p) { return p.codigo_barras && p.codigo_barras.trim().length > 0; });
    var sinCodigo = activos.length - conCodigo.length;
    var totalCola = colaEtiquetas.reduce(function (acc, item) { return acc + (parseInt(item.cantidad) || 0); }, 0);

    var elTotal = document.getElementById("etq-kpi-total");
    var elCon = document.getElementById("etq-kpi-con-codigo");
    var elSin = document.getElementById("etq-kpi-sin-codigo");
    var elCola = document.getElementById("etq-kpi-cola");
    var elBtnCount = document.getElementById("etq-btn-total-count");

    if (elTotal) elTotal.textContent = activos.length;
    if (elCon) elCon.textContent = conCodigo.length;
    if (elSin) elSin.textContent = sinCodigo;
    if (elCola) elCola.textContent = totalCola;
    if (elBtnCount) elBtnCount.textContent = totalCola;
  }

  async function cargarDatosEtiquetas() {
    await asegurarLibreriasCodigos();
    try {
      var resCat = await fetch("/categorias/");
      if (resCat.ok) {
        todasCategorias = await resCat.json();
        var selCat = document.getElementById("etq-filtro-categoria");
        if (selCat) {
          selCat.innerHTML = '<option value="">Todas las categorías</option>';
          todasCategorias.forEach(function (c) {
            selCat.innerHTML += '<option value="' + c.id + '">' + c.nombre_categoria + '</option>';
          });
        }
      }

      var resProd = await fetch("/productos/");
      if (resProd.ok) {
        var lista = await resProd.json();
        todosProductos = lista.filter(function (p) { return p.estado === 1; });
        actualizarKPIs();
        renderTablaProductosEtq();
        if (!productoPreviewActual && todosProductos.length > 0) {
          previsualizarEtiqueta(todosProductos[0].id);
        } else if (productoPreviewActual) {
          previsualizarEtiqueta(productoPreviewActual.id);
        }
      }
    } catch (e) {
      console.error("Error al cargar datos de etiquetas:", e);
      mostrarAlertaEtq("Error al cargar productos del almacén.", "danger");
    }
  }

  function obtenerProductosFiltrados() {
    var q = (document.getElementById("etq-buscador")?.value || "").toLowerCase().trim();
    var catId = document.getElementById("etq-filtro-categoria")?.value || "";
    var estCodigo = document.getElementById("etq-filtro-estado-codigo")?.value || "TODOS";

    return todosProductos.filter(function (p) {
      var coincideTexto = !q ||
        (p.nombre_producto || "").toLowerCase().includes(q) ||
        (p.codigo_barras || "").toLowerCase().includes(q);
      var coincideCat = !catId || String(p.categoria_id) === String(catId);
      var tieneCodigo = !!(p.codigo_barras && p.codigo_barras.trim().length > 0);
      var coincideEst = true;
      if (estCodigo === "CON_CODIGO") coincideEst = tieneCodigo;
      else if (estCodigo === "SIN_CODIGO") coincideEst = !tieneCodigo;
      else if (estCodigo === "CON_STOCK") coincideEst = (p.stock_actual || 0) > 0;

      return coincideTexto && coincideCat && coincideEst;
    });
  }

  function renderTablaProductosEtq() {
    var tbody = document.getElementById("etq-tabla-productos");
    var infoPag = document.getElementById("etq-info-paginacion");
    var controlesPag = document.getElementById("etq-controles-paginacion");
    if (!tbody) return;

    var filtrados = obtenerProductosFiltrados();
    var total = filtrados.length;
    var totalPaginas = Math.ceil(total / porPaginaEtq) || 1;
    if (paginaActualEtq > totalPaginas) paginaActualEtq = totalPaginas;
    if (paginaActualEtq < 1) paginaActualEtq = 1;

    var inicio = (paginaActualEtq - 1) * porPaginaEtq;
    var paginaItems = filtrados.slice(inicio, inicio + porPaginaEtq);

    if (infoPag) {
      infoPag.textContent = total === 0
        ? "Mostrando 0 de 0 productos"
        : "Mostrando " + (inicio + 1) + " - " + (inicio + paginaItems.length) + " de " + total + " productos";
    }

    if (filtrados.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No se encontraron productos con los filtros seleccionados.</td></tr>';
      if (controlesPag) controlesPag.innerHTML = "";
      return;
    }

    tbody.innerHTML = paginaItems.map(function (p, idx) {
      var catNombre = obtenerNombreCategoria(p.categoria_id);
      var codigo = (p.codigo_barras || "").trim();
      var badgeStock = p.stock_actual > 0
        ? '<span class="badge bg-success-subtle text-success">' + p.stock_actual + ' ' + (p.unidad_medida || 'UND') + '</span>'
        : '<span class="badge bg-danger-subtle text-danger">0 ' + (p.unidad_medida || 'UND') + '</span>';

      var celdaCodigo = codigo
        ? '<div class="d-flex align-items-center gap-1">' +
            '<span class="badge bg-light text-dark border font-monospace fs-12 px-2 py-1">' + codigo + '</span>' +
            '<button type="button" class="btn btn-xs btn-light border py-0 px-1 text-muted" onclick="generarYGuardarSku(' + p.id + ')" title="Regenerar SKU estructurado">' +
              '<i class="ri-refresh-line"></i>' +
            '</button>' +
          '</div>'
        : '<div class="d-flex align-items-center gap-1">' +
            '<span class="badge bg-warning-subtle text-warning">Sin SKU</span>' +
            '<button type="button" class="btn btn-xs btn-soft-primary fw-semibold py-0 px-2" onclick="generarYGuardarSku(' + p.id + ')" title="Generar y guardar SKU automático">' +
              '<i class="ri-magic-line me-1"></i>Generar SKU' +
            '</button>' +
          '</div>';

      return (
        '<tr>' +
          '<td class="text-muted fw-semibold">' + (inicio + idx + 1) + '</td>' +
          '<td>' +
            '<a href="javascript:void(0)" onclick="previsualizarEtiqueta(' + p.id + ')" class="fw-bold text-dark text-decoration-none d-block">' + p.nombre_producto + '</a>' +
            '<small class="text-muted">' + catNombre + '</small>' +
          '</td>' +
          '<td>' + celdaCodigo + '</td>' +
          '<td class="text-center">' + badgeStock + '</td>' +
          '<td class="text-end fw-semibold">S/ ' + parseFloat(p.precio_venta || 0).toFixed(2) + '</td>' +
          '<td class="text-center">' +
            '<div class="btn-group btn-group-sm">' +
              '<button type="button" class="btn btn-soft-secondary" onclick="previsualizarEtiqueta(' + p.id + ')" title="Ver vista previa de etiqueta">' +
                '<i class="ri-eye-line"></i>' +
              '</button>' +
              '<button type="button" class="btn btn-soft-primary fw-bold" onclick="agregarAColaEtiquetas(' + p.id + ', 1)" title="Agregar 1 etiqueta a la cola">' +
                '+1' +
              '</button>' +
              '<button type="button" class="btn btn-soft-success fw-semibold" onclick="agregarAColaSegunStock(' + p.id + ')" title="Agregar tantas etiquetas como stock actual (' + p.stock_actual + ')">' +
                '+Stock' +
              '</button>' +
            '</div>' +
          '</td>' +
        '</tr>'
      );
    }).join("");

    if (controlesPag) {
      controlesPag.innerHTML = "";
      if (totalPaginas > 1) {
        var btnPrev = document.createElement("button");
        btnPrev.type = "button";
        btnPrev.className = "btn btn-sm btn-light border px-2";
        btnPrev.disabled = paginaActualEtq === 1;
        btnPrev.innerHTML = '<i class="ri-arrow-left-s-line"></i>';
        btnPrev.onclick = function () {
          if (paginaActualEtq > 1) {
            paginaActualEtq--;
            renderTablaProductosEtq();
          }
        };
        controlesPag.appendChild(btnPrev);

        for (var p = 1; p <= totalPaginas; p++) {
          (function (numPag) {
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "btn btn-sm " + (numPag === paginaActualEtq ? "btn-primary fw-bold" : "btn-light border");
            btn.textContent = numPag;
            btn.onclick = function () {
              paginaActualEtq = numPag;
              renderTablaProductosEtq();
            };
            controlesPag.appendChild(btn);
          })(p);
        }

        var btnNext = document.createElement("button");
        btnNext.type = "button";
        btnNext.className = "btn btn-sm btn-light border px-2";
        btnNext.disabled = paginaActualEtq === totalPaginas;
        btnNext.innerHTML = '<i class="ri-arrow-right-s-line"></i>';
        btnNext.onclick = function () {
          if (paginaActualEtq < totalPaginas) {
            paginaActualEtq++;
            renderTablaProductosEtq();
          }
        };
        controlesPag.appendChild(btnNext);
      }
    }
  }

  async function guardarCodigoProductoEnBD(prod, nuevoCodigo) {
    var payload = {
      categoria_id: prod.categoria_id,
      codigo_barras: nuevoCodigo,
      nombre_producto: prod.nombre_producto,
      precio_compra: prod.precio_compra || 0,
      precio_venta: prod.precio_venta || 0,
      maneja_vencimiento: prod.maneja_vencimiento || 0,
      stock_minimo: prod.stock_minimo || 0,
      unidad_medida: prod.unidad_medida || "UND",
      estado: prod.estado
    };
    var res = await fetch("/productos/" + prod.id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error("No se pudo actualizar el SKU del producto");
    }
    prod.codigo_barras = nuevoCodigo;
  }

  async function generarYGuardarSku(prodId) {
    var prod = todosProductos.find(function (p) { return p.id === prodId; });
    if (!prod) return;

    var nuevoSku = construirSkuAutomatico(prod);
    try {
      await guardarCodigoProductoEnBD(prod, nuevoSku);
      actualizarKPIs();
      renderTablaProductosEtq();
      previsualizarEtiqueta(prod.id);
      mostrarAlertaEtq('SKU <strong>' + nuevoSku + '</strong> asignado y guardado para "' + prod.nombre_producto + '".', "success");
    } catch (e) {
      mostrarAlertaEtq("Error al guardar el SKU en la base de datos.", "danger");
    }
  }

  async function autogenerarSkusFaltantesMasivo() {
    var sinSku = todosProductos.filter(function (p) {
      return !p.codigo_barras || !p.codigo_barras.trim();
    });
    if (sinSku.length === 0) {
      mostrarAlertaEtq("¡Excelente! Todos los productos del almacén ya cuentan con un código SKU o de barras asignado.", "info");
      return;
    }

    var generados = 0;
    for (var i = 0; i < sinSku.length; i++) {
      var prod = sinSku[i];
      var sku = construirSkuAutomatico(prod);
      try {
        await guardarCodigoProductoEnBD(prod, sku);
        generados++;
      } catch (e) {
        console.error("Error asignando SKU a producto", prod.id, e);
      }
    }

    actualizarKPIs();
    renderTablaProductosEtq();
    if (productoPreviewActual) previsualizarEtiqueta(productoPreviewActual.id);
    mostrarAlertaEtq('Se generaron y guardaron automáticamente <strong>' + generados + ' códigos SKU</strong> en la base de datos.', "success");
  }

  function obtenerPayloadQR(prod, skuFinal) {
    var modo = document.getElementById("etq-cfg-qr-modo")?.value || "SOLO_SKU";
    if (modo === "FICHA") {
      var cat = obtenerNombreCategoria(prod.categoria_id);
      return "SKU:" + skuFinal + "|PROD:" + prod.nombre_producto + "|CAT:" + cat + "|PRECIO:S/" + parseFloat(prod.precio_venta || 0).toFixed(2);
    }
    return skuFinal;
  }

  function previsualizarEtiqueta(prodId) {
    var prod = todosProductos.find(function (p) { return p.id === prodId; });
    if (!prod) return;
    productoPreviewActual = prod;

    var skuFinal = (prod.codigo_barras && prod.codigo_barras.trim()) ? prod.codigo_barras.trim() : construirSkuAutomatico(prod);
    var catNombre = obtenerNombreCategoria(prod.categoria_id);

    var tipo = document.getElementById("etq-cfg-tipo")?.value || "QR";
    var showEmpresa = document.getElementById("etq-cfg-show-empresa")?.checked !== false;
    var showPrecio = document.getElementById("etq-cfg-show-precio")?.checked !== false;
    var showCat = document.getElementById("etq-cfg-show-cat")?.checked !== false;

    var elBadge = document.getElementById("etq-preview-sku-badge");
    if (elBadge) elBadge.textContent = skuFinal;

    var elEmp = document.getElementById("etq-prev-empresa");
    if (elEmp) elEmp.style.display = showEmpresa ? "block" : "none";

    var elNom = document.getElementById("etq-prev-nombre");
    if (elNom) elNom.textContent = prod.nombre_producto;

    var elCat = document.getElementById("etq-prev-cat");
    if (elCat) {
      elCat.style.display = showCat ? "block" : "none";
      elCat.textContent = catNombre + " • " + (prod.unidad_medida || "UND");
    }

    var elSkuText = document.getElementById("etq-prev-sku-text");
    if (elSkuText) elSkuText.textContent = skuFinal;

    var elPrecio = document.getElementById("etq-prev-precio");
    if (elPrecio) {
      elPrecio.style.display = showPrecio ? "inline" : "none";
      elPrecio.textContent = "S/ " + parseFloat(prod.precio_venta || 0).toFixed(2);
    }

    var previewCard = document.getElementById("etq-live-preview-card");
    if (previewCard) {
      previewCard.style.width = tipo === "AMBOS" ? "310px" : "240px";
    }

    var qrCont = document.getElementById("etq-prev-qr-container");
    var barCont = document.getElementById("etq-prev-barcode-container");
    var barSvg = document.getElementById("etq-prev-barcode-svg");

    if (qrCont) {
      qrCont.innerHTML = "";
      if (tipo === "QR" || tipo === "AMBOS") {
        qrCont.style.display = "inline-block";
        if (typeof window.QRCode !== "undefined") {
          new window.QRCode(qrCont, {
            text: obtenerPayloadQR(prod, skuFinal),
            width: tipo === "AMBOS" ? 72 : 110,
            height: tipo === "AMBOS" ? 72 : 110,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: window.QRCode.CorrectLevel.M
          });
        }
      } else {
        qrCont.style.display = "none";
      }
    }

    if (barCont && barSvg) {
      if (tipo === "BARCODE" || tipo === "AMBOS") {
        barCont.style.display = "inline-block";
        if (typeof window.JsBarcode !== "undefined") {
          try {
            window.JsBarcode(barSvg, skuFinal, {
              format: "CODE128",
              width: tipo === "AMBOS" ? 1.15 : 1.5,
              height: tipo === "AMBOS" ? 36 : 48,
              displayValue: false,
              margin: 2
            });
          } catch (e) {
            console.error("Error renderizando JsBarcode:", e);
          }
        }
      } else {
        barSvg.innerHTML = "";
        barSvg.removeAttribute("width");
        barSvg.removeAttribute("height");
        barCont.style.display = "none";
      }
    }
  }

  async function agregarAColaEtiquetas(prodId, cantidadAgregar) {
    var prod = todosProductos.find(function (p) { return p.id === prodId; });
    if (!prod) return;

    // Si el producto aún no tiene SKU en la BD, se lo generamos y guardamos automáticamente
    if (!prod.codigo_barras || !prod.codigo_barras.trim()) {
      var nuevoSku = construirSkuAutomatico(prod);
      try {
        await guardarCodigoProductoEnBD(prod, nuevoSku);
        renderTablaProductosEtq();
      } catch (e) {
        console.warn("Usando SKU temporal:", nuevoSku);
        prod.codigo_barras = nuevoSku;
      }
    }

    previsualizarEtiqueta(prod.id);

    var cant = Math.max(1, parseInt(cantidadAgregar) || 1);
    var existente = colaEtiquetas.find(function (item) { return item.producto_id === prodId; });
    if (existente) {
      existente.cantidad += cant;
    } else {
      colaEtiquetas.push({
        producto_id: prod.id,
        cantidad: cant
      });
    }

    actualizarKPIs();
    renderColaEtiquetas();
  }

  function agregarAColaSegunStock(prodId) {
    var prod = todosProductos.find(function (p) { return p.id === prodId; });
    if (!prod) return;
    var cant = (prod.stock_actual && prod.stock_actual > 0) ? prod.stock_actual : 1;
    agregarAColaEtiquetas(prodId, cant);
  }

  function cambiarCantidadColaEtq(prodId, nuevaCant) {
    var item = colaEtiquetas.find(function (x) { return x.producto_id === prodId; });
    if (!item) return;
    var val = parseInt(nuevaCant) || 0;
    if (val <= 0) {
      quitarDeColaEtq(prodId);
      return;
    }
    item.cantidad = Math.min(val, 500);
    actualizarKPIs();
    renderColaEtiquetas();
  }

  function quitarDeColaEtq(prodId) {
    colaEtiquetas = colaEtiquetas.filter(function (x) { return x.producto_id !== prodId; });
    actualizarKPIs();
    renderColaEtiquetas();
  }

  function renderColaEtiquetas() {
    var tbody = document.getElementById("etq-tabla-cola");
    if (!tbody) return;

    if (colaEtiquetas.length === 0) {
      tbody.innerHTML =
        '<tr>' +
          '<td colspan="3" class="text-center py-4 text-muted fs-13">' +
            'No hay etiquetas en cola. Haz clic en <strong>+1</strong> o <strong>+Stock</strong> en la lista izquierda.' +
          '</td>' +
        '</tr>';
      return;
    }

    tbody.innerHTML = colaEtiquetas.map(function (item) {
      var prod = todosProductos.find(function (p) { return p.id === item.producto_id; });
      if (!prod) return "";
      var sku = prod.codigo_barras || construirSkuAutomatico(prod);

      return (
        '<tr>' +
          '<td class="ps-3">' +
            '<div class="fw-bold text-dark text-truncate" style="max-width: 190px;">' + prod.nombre_producto + '</div>' +
            '<small class="font-monospace text-muted">' + sku + '</small>' +
          '</td>' +
          '<td class="text-center">' +
            '<div class="input-group input-group-sm" style="width: 110px; margin: 0 auto;">' +
              '<button class="btn btn-light border px-2" type="button" onclick="cambiarCantidadColaEtq(' + prod.id + ', ' + (item.cantidad - 1) + ')">-</button>' +
              '<input type="number" class="form-control text-center fw-bold px-1" min="1" max="500" value="' + item.cantidad + '" onchange="cambiarCantidadColaEtq(' + prod.id + ', this.value)" />' +
              '<button class="btn btn-light border px-2" type="button" onclick="cambiarCantidadColaEtq(' + prod.id + ', ' + (item.cantidad + 1) + ')">+</button>' +
            '</div>' +
          '</td>' +
          '<td class="text-center pe-3">' +
            '<button type="button" class="btn btn-xs btn-soft-danger" onclick="quitarDeColaEtq(' + prod.id + ')" title="Quitar">' +
              '<i class="ri-close-line"></i>' +
            '</button>' +
          '</td>' +
        '</tr>'
      );
    }).join("");
  }

  function generarQrDataUrl(texto, size) {
    return new Promise(function (resolve) {
      if (typeof window.QRCode === "undefined") {
        resolve("");
        return;
      }
      var tempDiv = document.createElement("div");
      tempDiv.style.position = "fixed";
      tempDiv.style.left = "-9999px";
      document.body.appendChild(tempDiv);

      new window.QRCode(tempDiv, {
        text: texto,
        width: size,
        height: size,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: window.QRCode.CorrectLevel.M
      });

      setTimeout(function () {
        var canvas = tempDiv.querySelector("canvas");
        var img = tempDiv.querySelector("img");
        var dataUrl = "";
        if (canvas) {
          dataUrl = canvas.toDataURL("image/png");
        } else if (img && img.src) {
          dataUrl = img.src;
        }
        document.body.removeChild(tempDiv);
        resolve(dataUrl);
      }, 60);
    });
  }

  function generarBarcodeSvgMarkup(codigo, width, height) {
    if (typeof window.JsBarcode === "undefined") return "";
    var svgNS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgNS, "svg");
    try {
      window.JsBarcode(svg, codigo, {
        format: "CODE128",
        width: width || 1.4,
        height: height || 38,
        displayValue: false,
        margin: 0
      });
      return svg.outerHTML;
    } catch (e) {
      return "";
    }
  }

  async function imprimirLoteEtiquetas() {
    if (colaEtiquetas.length === 0) {
      if (productoPreviewActual) {
        await agregarAColaEtiquetas(productoPreviewActual.id, 1);
      } else {
        mostrarAlertaEtq("Agregue al menos un producto a la cola de impresión.", "warning");
        return;
      }
    }

    var tipo = document.getElementById("etq-cfg-tipo")?.value || "QR";
    var papel = document.getElementById("etq-cfg-papel")?.value || "TERMICA_1";
    var showEmpresa = document.getElementById("etq-cfg-show-empresa")?.checked !== false;
    var showPrecio = document.getElementById("etq-cfg-show-precio")?.checked !== false;
    var showCat = document.getElementById("etq-cfg-show-cat")?.checked !== false;

    var tarjetasHtml = [];

    for (var i = 0; i < colaEtiquetas.length; i++) {
      var item = colaEtiquetas[i];
      var prod = todosProductos.find(function (p) { return p.id === item.producto_id; });
      if (!prod) continue;

      var sku = (prod.codigo_barras && prod.codigo_barras.trim()) ? prod.codigo_barras.trim() : construirSkuAutomatico(prod);
      var catNombre = obtenerNombreCategoria(prod.categoria_id);
      var qrDataUrl = "";
      var barSvgHtml = "";

      if (tipo === "QR" || tipo === "AMBOS") {
        qrDataUrl = await generarQrDataUrl(obtenerPayloadQR(prod, sku), tipo === "AMBOS" ? 64 : 84);
      }
      if (tipo === "BARCODE" || tipo === "AMBOS") {
        barSvgHtml = generarBarcodeSvgMarkup(sku, tipo === "AMBOS" ? 1.1 : 1.4, tipo === "AMBOS" ? 32 : 42);
      }

      var bloqueVisual = '<div class="codes-box">';
      if (qrDataUrl) {
        bloqueVisual += '<img src="' + qrDataUrl + '" class="qr-img" alt="QR" />';
      }
      if (barSvgHtml) {
        bloqueVisual += '<div class="bar-box">' + barSvgHtml + '</div>';
      }
      bloqueVisual += '</div>';

      var labelSingleHtml =
        '<div class="label-item">' +
          (showEmpresa ? '<div class="lbl-empresa">FLUXO SHOP</div>' : '') +
          '<div class="lbl-nombre">' + prod.nombre_producto + '</div>' +
          (showCat ? '<div class="lbl-cat">' + catNombre + ' • ' + (prod.unidad_medida || 'UND') + '</div>' : '') +
          bloqueVisual +
          '<div class="lbl-footer">' +
            '<span class="lbl-sku">' + sku + '</span>' +
            (showPrecio ? '<span class="lbl-precio">S/ ' + parseFloat(prod.precio_venta || 0).toFixed(2) + '</span>' : '') +
          '</div>' +
        '</div>';

      for (var c = 0; c < item.cantidad; c++) {
        tarjetasHtml.push(labelSingleHtml);
      }
    }

    var gridColumns = "1fr";
    var pageWidthCss = "@page { size: 52mm auto; margin: 2mm; } body { width: 48mm; margin: 0 auto; }";
    if (papel === "TERMICA_2") {
      gridColumns = "repeat(2, 1fr)";
      pageWidthCss = "@page { size: 105mm auto; margin: 2mm; } body { width: 100mm; margin: 0 auto; }";
    } else if (papel === "A4_3X7") {
      gridColumns = "repeat(3, 1fr)";
      pageWidthCss = "@page { size: A4 portrait; margin: 8mm; } body { width: 100%; margin: 0; }";
    } else if (papel === "A4_4X10") {
      gridColumns = "repeat(4, 1fr)";
      pageWidthCss = "@page { size: A4 portrait; margin: 6mm; } body { width: 100%; margin: 0; }";
    }

    var printDocHtml =
      '<!DOCTYPE html>' +
      '<html><head><meta charset="utf-8"><title>Etiquetas QR / SKU - Fluxo Shop</title>' +
      '<style>' +
        pageWidthCss +
        '* { box-sizing: border-box; }' +
        'body { font-family: Arial, Helvetica, sans-serif; color: #000; }' +
        '.labels-grid { display: grid; grid-template-columns: ' + gridColumns + '; gap: 3mm; }' +
        '.label-item { border: 1px dashed #666; border-radius: 4px; padding: 2.5mm; text-align: center; page-break-inside: avoid; break-inside: avoid; background: #fff; }' +
        '.lbl-empresa { font-size: 8px; font-weight: 800; letter-spacing: 0.8px; border-bottom: 1px dashed #ccc; padding-bottom: 1mm; margin-bottom: 1mm; }' +
        '.lbl-nombre { font-size: 10px; font-weight: 700; line-height: 1.15; max-height: 2.3em; overflow: hidden; }' +
        '.lbl-cat { font-size: 8px; color: #444; margin-bottom: 1.5mm; }' +
        '.codes-box { display: flex; align-items: center; justify-content: center; gap: 2mm; margin: 1.5mm 0; }' +
        '.qr-img { width: ' + (tipo === "AMBOS" ? "17mm" : "22mm") + '; height: ' + (tipo === "AMBOS" ? "17mm" : "22mm") + '; display: block; }' +
        '.bar-box svg { max-width: 100%; height: auto; display: block; }' +
        '.lbl-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #ddd; padding-top: 1mm; margin-top: 1mm; }' +
        '.lbl-sku { font-family: "Courier New", monospace; font-size: 9.5px; font-weight: 700; }' +
        '.lbl-precio { font-size: 10.5px; font-weight: 800; }' +
      '</style></head><body>' +
      '<div class="labels-grid">' + tarjetasHtml.join("") + '</div>' +
      '</body></html>';

    var printIframe = document.getElementById("iframe-impresion-etiquetas");
    if (!printIframe) {
      printIframe = document.createElement("iframe");
      printIframe.id = "iframe-impresion-etiquetas";
      printIframe.style.position = "fixed";
      printIframe.style.right = "0";
      printIframe.style.bottom = "0";
      printIframe.style.width = "0";
      printIframe.style.height = "0";
      printIframe.style.border = "0";
      document.body.appendChild(printIframe);
    }

    var doc = printIframe.contentWindow.document;
    doc.open();
    doc.write(printDocHtml);
    doc.close();
    setTimeout(function () {
      printIframe.contentWindow.focus();
      printIframe.contentWindow.print();
    }, 300);
  }

  // Vinculación de eventos de filtros y configuración
  ["etq-buscador", "etq-filtro-categoria", "etq-filtro-estado-codigo"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) {
      el.oninput = function () { paginaActualEtq = 1; renderTablaProductosEtq(); };
      el.onchange = function () { paginaActualEtq = 1; renderTablaProductosEtq(); };
    }
  });

  ["etq-cfg-tipo", "etq-cfg-papel", "etq-cfg-qr-modo", "etq-cfg-show-empresa", "etq-cfg-show-precio", "etq-cfg-show-cat"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) {
      el.onchange = function () {
        if (productoPreviewActual) previsualizarEtiqueta(productoPreviewActual.id);
      };
    }
  });

  var btnAutoMasivo = document.getElementById("btn-autogenerar-skus-masivo");
  if (btnAutoMasivo) {
    btnAutoMasivo.onclick = autogenerarSkusFaltantesMasivo;
  }

  var btnTodosStock = document.getElementById("btn-agregar-todos-stock");
  if (btnTodosStock) {
    btnTodosStock.onclick = async function () {
      var filtradosConStock = obtenerProductosFiltrados().filter(function (p) { return (p.stock_actual || 0) > 0; });
      if (filtradosConStock.length === 0) {
        mostrarAlertaEtq("No hay productos con stock mayor a 0 en la lista actual.", "warning");
        return;
      }
      for (var i = 0; i < filtradosConStock.length; i++) {
        await agregarAColaEtiquetas(filtradosConStock[i].id, filtradosConStock[i].stock_actual);
      }
      mostrarAlertaEtq("Se cargaron " + filtradosConStock.length + " productos a la cola según su stock en almacén.", "success");
    };
  }

  var btnVaciar = document.getElementById("btn-vaciar-cola-etq");
  if (btnVaciar) {
    btnVaciar.onclick = function () {
      colaEtiquetas = [];
      actualizarKPIs();
      renderColaEtiquetas();
    };
  }

  var btnImprimir = document.getElementById("btn-imprimir-lote-etiquetas");
  if (btnImprimir) {
    btnImprimir.onclick = imprimirLoteEtiquetas;
  }

  window.cargarDatosEtiquetas = cargarDatosEtiquetas;
  window.previsualizarEtiqueta = previsualizarEtiqueta;
  window.generarYGuardarSku = generarYGuardarSku;
  window.agregarAColaEtiquetas = agregarAColaEtiquetas;
  window.agregarAColaSegunStock = agregarAColaSegunStock;
  window.cambiarCantidadColaEtq = cambiarCantidadColaEtq;
  window.quitarDeColaEtq = quitarDeColaEtq;

  cargarDatosEtiquetas();
})();
