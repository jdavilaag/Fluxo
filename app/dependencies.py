from fastapi import Request, HTTPException

def require_auth(request: Request):
    usuario = request.session.get("usuario")
    if not usuario:
        raise HTTPException(status_code=401, detail="No autorizado")
    return usuario
