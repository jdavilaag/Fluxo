from fastapi import Request, HTTPException, Depends

def require_auth(request: Request):
    usuario = request.session.get("usuario")
    if not usuario:
        raise HTTPException(status_code=401, detail="No autorizado")
    return usuario

def require_permission(permiso: str):
    def dependency(usuario: dict = Depends(require_auth)):
        if usuario.get("rol_id") == 1:
            return usuario
        permisos = usuario.get("permisos", [])
        if permiso not in permisos:
            raise HTTPException(status_code=403, detail="No tiene permisos suficientes")
        return usuario
    return dependency
