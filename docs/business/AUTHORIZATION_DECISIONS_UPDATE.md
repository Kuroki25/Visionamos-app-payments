# Red Coopagos — Actualización de decisiones de autorización

## Decisiones confirmadas

- `ADMIN_PORTAL` puede crear, actualizar y desactivar comercios de su portal, pero no eliminarlos.
- `ADMIN_COMMERCE` opera únicamente sobre su comercio específico.
- `ADMIN_PORTAL` puede crear `ADMIN_COMMERCE`.
- `ADMIN_PORTAL` puede crear `VIEWER`.
- `ADMIN_COMMERCE` puede crear `VIEWER` limitado a su comercio.
- `SUPERADMIN` y `ADMIN_PORTAL` pueden publicar/despublicar portales según scope.
- `ADMIN_PORTAL` publica/despublica comercios de su portal.
- `SUPERADMIN` y `ADMIN_PORTAL` publican formularios.
- Las categorías son específicas por portal.
- `VIEWER` puede exportar información de datos en Excel dentro de su scope.
- Correcciones financieras: confirmado `SUPERADMIN` y `ADMIN_PORTAL`; cualquier rol genérico `ADMIN` queda pendiente de definición formal.

## Reasignación de scopes

Se recomienda permitirla con controles estrictos, auditoría y revocación inmediata del scope anterior. El detalle queda documentado en `ROLE_PERMISSION_MATRIX.md`.
