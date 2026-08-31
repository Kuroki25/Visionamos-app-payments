# Red Coopagos — PAYMENT_DOMAIN_DECISIONS

## Confirmado

- El cliente paga en Portal Público, nunca en Backoffice.
- El cliente no necesita cuenta.
- Datos base: correo, tipo documento, número documento, nombre, apellidos y celular.
- El formulario dinámico se configura en Backoffice y se diligencia en Portal Público.
- Existe una cuota/obligación o monto de referencia.
- El cliente puede pagar la cuota correspondiente.
- Se contempla pagar un valor superior.
- La transacción cambia según el resultado real del procesamiento.
- No debe existir edición manual arbitraria del estado.
- Debe existir un mecanismo posterior de corrección ante problemas reportados.
- `ADMIN_PORTAL` no elimina comercios.
- Categorías son específicas por portal.
- `VIEWER` exporta datos a Excel dentro de su scope.

## Recomendado técnicamente, pendiente de aprobación formal

- `PaymentIntent` o contexto equivalente antes de ejecutar el proveedor.
- Versionamiento de formularios.
- Snapshot de datos del pagador.
- Snapshot de obligación consultada.
- Historial de eventos transaccionales.
- Reasignación controlada de scopes.
- Jerarquía global → portal → comercio para métodos de pago.
- Consulta pública posterior mediante referencia segura.
- Conciliación.

## Pendiente de negocio

- Fuente exacta de obligación/cuota.
- Pago parcial.
- Límite de sobrepago.
- Moneda(s).
- Proveedores de pago.
- Métodos habilitados por nivel.
- Devoluciones.
- Reversos.
- Transferencia compensatoria.
- Liquidaciones.
- Comisiones.
- Conciliación definitiva.
- Semántica exacta de errores/estados del proveedor.
