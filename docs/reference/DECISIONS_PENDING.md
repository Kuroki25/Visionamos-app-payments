# Red Coopagos — Decisiones pendientes de negocio

Este archivo evita que Claude convierta incertidumbres en implementación definitiva.

## Alta prioridad antes/durante diseño de Payments

1. Fuente exacta de la obligación/cuota: API externa, carga previa, valor manual o estrategia híbrida.
2. ¿Se permite pago parcial?
3. ¿Cuál es el límite de sobrepago?
4. Moneda o monedas soportadas.
5. Proveedores/mecanismos reales de pago.
6. Jerarquía definitiva de habilitación de métodos: global → Portal → Comercio → Servicio.
7. Semántica real de estados del proveedor, especialmente timeouts y estados inciertos.
8. Mecanismo de consulta posterior de una transacción por cliente sin cuenta.

## Operación financiera

9. Definir devolución.
10. Definir reverso.
11. Definir transferencia/corrección compensatoria.
12. Confirmar liquidaciones.
13. Confirmar comisiones.
14. Confirmar conciliación.

## Catálogo y administración

15. ¿Un Comercio puede pertenecer a una sola Categoría de su Portal o a varias?
16. Confirmar si `ADMIN_COMMERCE` puede activar/desactivar el propio Comercio o únicamente editar su contenido.
17. Confirmar si existe realmente un rol administrativo genérico adicional a `SUPERADMIN`, `ADMIN_PORTAL`, `ADMIN_COMMERCE` y `VIEWER`.
18. Confirmar formalmente la política de reasignación de scopes propuesta.

## Regla

No bloquear la auditoría técnica por estas preguntas. Sí deben marcarse como pendientes y evitar decisiones físicas irreversibles que dependan de ellas.
