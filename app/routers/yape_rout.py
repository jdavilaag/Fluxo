from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse, StreamingResponse
import uuid
import random
import io
import qrcode

router = APIRouter(
    prefix="/yape",
    tags=["yape"]
)

yape_payments = {}

@router.get("/crear-token")
def yape_crear_token(monto: float):
    token = str(uuid.uuid4())
    yape_payments[token] = {
        "monto": monto,
        "estado": "PENDIENTE",
        "codigo_referencia": None
    }
    return {"token": token}

@router.get("/qr/{token}")
def get_yape_qr(token: str, monto: float, request: Request):
    base_url = str(request.base_url).rstrip("/")
    redirect_url = f"{base_url}/yape/pay-confirm?token={token}&monto={monto}"
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(redirect_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    
    return StreamingResponse(buf, media_type="image/png")

@router.get("/status/{token}")
def yape_status(token: str):
    pago = yape_payments.get(token)
    if not pago:
        return {"pagado": False, "codigo_referencia": None}
    return {
        "pagado": pago["estado"] == "PAGADO",
        "codigo_referencia": pago["codigo_referencia"]
    }

@router.post("/confirmar/{token}")
def yape_confirmar(token: str):
    pago = yape_payments.get(token)
    if not pago:
        raise HTTPException(status_code=404, detail="Token no encontrado")
    ref = f"YAP-{random.randint(100000, 999999)}"
    pago["estado"] = "PAGADO"
    pago["codigo_referencia"] = ref
    return {"success": True, "codigo_referencia": ref}

@router.get("/pay-confirm", response_class=HTMLResponse)
def yape_pay_confirm(token: str, monto: float):
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Yape - Pago Simulado</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      <link href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" rel="stylesheet">
      <style>
        body {{
          background-color: #74227C; /* Color Yape */
          color: #fff;
          font-family: 'Outfit', sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
        }}
        .card {{
          background-color: #fff;
          color: #333;
          border-radius: 20px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          max-width: 360px;
          width: 90%;
          padding: 24px;
          text-align: center;
        }}
        .yape-logo {{
          width: 80px;
          margin-bottom: 16px;
        }}
        .amount-box {{
          background-color: #f7f1f9;
          border-radius: 12px;
          padding: 16px;
          margin: 20px 0;
        }}
        .amount {{
          font-size: 32px;
          font-weight: 800;
          color: #74227C;
        }}
        .btn-yape {{
          background-color: #00D1C4; /* Botón turquesa de Yape */
          border: none;
          color: #74227C;
          font-weight: bold;
          padding: 12px 24px;
          border-radius: 30px;
          font-size: 16px;
          width: 100%;
          transition: all 0.2s;
        }}
        .btn-yape:hover {{
          background-color: #00b8ad;
          transform: translateY(-2px);
        }}
        .success-icon {{
          font-size: 64px;
          color: #00D1C4;
          margin-bottom: 16px;
        }}
      </style>
    </head>
    <body>
      <div class="card" id="card-content">
        <img src="https://logodownload.org/wp-content/uploads/2021/06/yape-logo.png" class="yape-logo mx-auto" alt="Yape" onerror="this.style.display='none';">
        <h4 class="fw-bold" style="color: #74227C;">Pago de Venta</h4>
        <p class="text-muted mb-0">Comprobante de Pago a FLUXO SHOP</p>
        
        <div class="amount-box">
          <span class="d-block text-muted text-uppercase fs-11 fw-semibold">MONTO A PAGAR</span>
          <span class="amount">S/ {monto:.2f}</span>
        </div>

        <button class="btn btn-yape mb-3" id="btn-confirmar">
          <i class="ri-wallet-3-line me-1"></i> Yapear Ahora
        </button>
        <p class="text-muted small mb-0"><i class="ri-shield-check-line"></i> Conexión 100% segura</p>
      </div>

      <script>
        document.getElementById('btn-confirmar').onclick = function() {{
          const btn = this;
          btn.disabled = true;
          btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span> Procesando...';
          
          fetch('/yape/confirmar/' + '{token}', {{ method: 'POST' }})
            .then(res => res.json())
            .then(data => {{
              if (data.success) {{
                document.getElementById('card-content').innerHTML = `
                  <div class="success-icon"><i class="ri-checkbox-circle-fill"></i></div>
                  <h3 class="fw-bold" style="color: #74227C;">¡Yapeo Exitoso!</h3>
                  <p class="text-muted">Se ha enviado el pago de <strong>S/ {monto:.2f}</strong> a FLUXO SHOP.</p>
                  <div class="alert alert-success mt-2 py-2 fs-13">
                    <strong>Ref:</strong> ${{data.codigo_referencia}}
                  </div>
                  <p class="text-muted small mt-3">Ya puedes cerrar esta ventana.</p>
                `;
              }} else {{
                btn.disabled = false;
                btn.innerText = 'Intentar de nuevo';
                alert('Error al procesar el pago.');
              }}
            }})
            .catch(err => {{
              btn.disabled = false;
              btn.innerText = 'Intentar de nuevo';
              alert('Error de conexión.');
            }});
        }};
      </script>
    </body>
    </html>
    """
