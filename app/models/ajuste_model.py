from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.conexion import Base

class AjusteInventario(Base):
    __tablename__ = "ajustes_inventario"

    id = Column("ajuste_inventario_id", Integer, primary_key=True, index=True)
    producto_id = Column(Integer, ForeignKey("productos.producto_id"), nullable=False, index=True)
    lote_id = Column(Integer, ForeignKey("lotes.lote_id"), nullable=True, index=True)
    usuario_solicitante_id = Column(Integer, ForeignKey("usuarios.usuario_id"), nullable=False, index=True)
    usuario_aprobador_id = Column(Integer, ForeignKey("usuarios.usuario_id"), nullable=True, index=True)
    tipo_ajuste = Column(String(50), nullable=False)  # 'ENTRADA' or 'SALIDA'
    cantidad = Column(Numeric(10, 2), nullable=False)
    motivo = Column(String(50), nullable=False)  # 'MERMA', 'ROBO', 'ERROR_CONTEO', 'VENCIMIENTO', 'OTRO'
    observacion = Column(String(255), nullable=True)
    estado = Column(String(50), default="PENDIENTE", nullable=False, index=True)
    fecha_solicitud = Column(DateTime, server_default=func.now(), nullable=False)
    fecha_aprobacion = Column(DateTime, nullable=True)
