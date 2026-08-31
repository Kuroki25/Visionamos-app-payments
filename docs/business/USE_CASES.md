# Red Coopagos — USE_CASES

**Estado:** FASE 1 — Modelo de negocio
**Propósito:** identificar casos de uso sin convertir todavía cada uno en endpoint o tabla.

## 1. Contextos de interacción

### Backoffice Administrativo
Usado exclusivamente por usuarios administrativos para configurar, gobernar, supervisar y reportar.

### Portal Público
Usado por clientes/pagadores para descubrir comercios/servicios, diligenciar formularios y realizar pagos sin crear una cuenta.

# 2. Casos de uso — Backoffice

## UC-ADM-001 — Iniciar sesión en Backoffice
**Actor:** AppUser administrativo.

Resultado: sesión administrativa válida con roles/scopes aplicables.

## UC-ADM-002 — Crear usuario administrativo
**Actor principal:** SUPERADMIN.

Incluye identidad administrativa, estado, rol y scope.

## UC-ADM-003 — Administrar usuario administrativo
Consultar, editar datos permitidos, activar/desactivar, reasignar rol/scope cuando esté autorizado y gestionar recuperación de acceso.

No incluye clientes/pagadores del Portal Público.

## UC-PORT-001 — Crear portal
**Actor:** SUPERADMIN.

Crea el portal en Backoffice. No se asume publicación automática.

## UC-PORT-002 — Editar portal
**Actores:** SUPERADMIN y ADMIN_PORTAL sobre su scope.

## UC-PORT-003 — Publicar/despublicar portal
**Actores:** SUPERADMIN y ADMIN_PORTAL sobre su propio portal.

Controla la visibilidad del Portal en el Portal Público. El ADMIN_PORTAL nunca puede publicar/despublicar un portal fuera de su scope.

## UC-CAT-001 — Crear categoría de comercio
Ejemplos: Instituciones educativas, Hoteles, Salud, Deportes.

La categoría clasifica comercios, no servicios.

## UC-COM-001 — Crear comercio aliado
**Actores:** SUPERADMIN; ADMIN_PORTAL dentro de su portal.

Invariantes:
- pertenece a un único portal;
- debe respetar categoría y scope.

## UC-COM-002 — Editar comercio aliado
**Actores:** SUPERADMIN, ADMIN_PORTAL, ADMIN_COMMERCE según scope.

## UC-COM-003 — Publicar/despublicar comercio
Controla su exposición en Portal Público. Permisos exactos pendientes.

## UC-SRV-001 — Crear servicio
**Actores:** SUPERADMIN, ADMIN_PORTAL, ADMIN_COMMERCE según scope.

Ejemplos: matrícula, mensualidad, reserva, cuota, inscripción.

## UC-SRV-002 — Configurar reglas de pago del servicio
Puede incluir, cuando negocio lo confirme:
- origen de obligación/cuota;
- monto mínimo;
- sobrepago;
- pago parcial;
- método de pago permitido;
- vigencia;
- referencia requerida.

## UC-FRM-001 — Crear definición de formulario dinámico
El administrador configura el formulario asociado a un servicio.

El formulario no se diligencia en Backoffice.

## UC-FRM-002 — Configurar campos
Posibles propiedades: etiqueta, tipo, requerido, orden, opciones, validaciones, ayuda y condiciones.

## UC-FRM-003 — Crear nueva versión
Los cambios que afecten el significado de datos históricos deben crear una nueva versión o mecanismo equivalente.

## UC-FRM-004 — Publicar formulario
Hace disponible una versión para el Portal Público.

## UC-PAYM-001 — Configurar métodos de pago
**Estado:** jerarquía de habilitación pendiente.

## UC-TXN-ADM-001 — Consultar transacciones
Filtros candidatos: fecha, portal, comercio, servicio, estado, método, referencia y documento del pagador con controles de privacidad.

## UC-TXN-ADM-002 — Ver detalle de transacción
Debe reconstruir portal, comercio, servicio, formulario/versión, datos pertinentes del pagador, monto, método, estado, eventos y referencias externas.

## UC-TXN-ADM-003 — Ejecutar corrección financiera
**Estado:** terminología/autorización pendiente.

No modifica la historia original para ocultar el evento.

Puede terminar siendo reverso, devolución, ajuste, reembolso o transferencia compensatoria.

## UC-RPT-001 — Consultar dashboard/reportes
Datos filtrados por scope.

## UC-RPT-002 — Exportar reporte
Debe definir permisos, límites, protección de PII y auditoría.

# 3. Casos de uso — Portal Público

## UC-PUB-001 — Consultar portales publicados
Solo recursos habilitados para exposición pública.

## UC-PUB-002 — Explorar categorías
Organiza visualmente los comercios.

## UC-PUB-003 — Consultar comercios de un portal
Solo comercios pertenecientes al portal solicitado, habilitados y publicados.

## UC-PUB-004 — Consultar servicios de un comercio
Solo servicios disponibles públicamente.

## UC-PUB-005 — Obtener formulario dinámico publicado
El Portal Público recibe la definición/versión y la renderiza.

El backend revalida posteriormente los constraints relevantes.

## UC-PUB-006 — Diligenciar datos del pagador
Datos base:
- correo;
- tipo de documento;
- número de documento;
- nombre;
- apellidos;
- celular.

Esto no crea un `AppUser`.

## UC-PUB-007 — Diligenciar datos específicos del servicio
Dependen de la versión publicada del formulario.

## UC-PUB-008 — Consultar obligación/cuota
**Confirmado conceptualmente; mecanismo pendiente.**

Pendiente definir si Coopagos:
1. almacena obligaciones;
2. consulta API del comercio;
3. recibe archivo/lote;
4. permite valor introducido;
5. soporta varios modelos.

## UC-PUB-009 — Elegir monto a pagar
Conocido:
- existe cuota/monto de referencia;
- puede pagarse la cuota;
- puede existir sobrepago.

Pendiente: pago parcial, máximo, redondeos y moneda.

## UC-PUB-010 — Seleccionar método de pago
Solo métodos permitidos para la operación.

## UC-PUB-011 — Iniciar pago
Debe validar formulario, pagador, monto y método; evitar duplicados; generar correlación e iniciar la integración.

## UC-PUB-012 — Procesar resultado de pago
El estado cambia por eventos reales del flujo de pago, no por CRUD manual arbitrario.

## UC-PUB-013 — Mostrar resultado/comprobante
Debe mostrar referencia, comercio, servicio, monto, fecha, estado e información segura de comprobación.

# 4. Integraciones

## UC-INT-001 — Consultar obligación a sistema externo
**Pendiente de confirmar.**

Requiere timeout, autenticación, validación de respuesta, mapeo de errores, observabilidad y controles SSRF cuando aplique.

## UC-INT-002 — Iniciar transacción con proveedor de pago
Debe conservar referencias internas y externas.

## UC-INT-003 — Recibir webhook/callback
Debe validar autenticidad, firma, timestamp, replay, esquema e idempotencia.

## UC-INT-004 — Reconciliar transacciones
**Pendiente de confirmación; alta probabilidad de necesidad.**

# 5. Seguridad y auditoría

## UC-SEC-001 — Registrar evento administrativo crítico
Ejemplos: crear/desactivar usuario, cambiar rol/scope, publicar recursos, ejecutar correcciones financieras.

## UC-SEC-002 — Bloquear acceso fuera de scope
Ejemplos: Admin Portal A intenta acceder Portal B; Admin Comercio A altera `commerceId`; Viewer intenta escribir.

## UC-SEC-003 — Proteger endpoints públicos de abuso
Rate limiting, límites de payload, validación, idempotencia, protección contra enumeración y controles antifraude según necesidad.

# 6. Flujos principales

## Flujo administrativo

```text
Administrador
    ↓
Backoffice
    ↓
Crea/configura Portal
    ↓
Crea Categorías
    ↓
Crea Comercio
    ↓
Crea Servicio
    ↓
Configura Formulario
    ↓
Publica recursos autorizados
    ↓
Portal Público puede consultarlos
```

## Flujo público de pago

```text
Cliente
    ↓
Portal Público
    ↓
Portal
    ↓
Categoría
    ↓
Comercio
    ↓
Servicio
    ↓
Formulario publicado
    ↓
Datos pagador + datos servicio
    ↓
Consulta obligación
    ↓
Monto
    ↓
Método de pago
    ↓
Intento de pago
    ↓
Transacción
    ↓
Proveedor
    ↓
Resultado
    ↓
Comprobante
```

# 7. Casos pendientes de confirmación

1. Publicación automática vs explícita.
2. Origen real de obligación/cuota.
3. Pago parcial.
4. Límite de sobrepago.
5. Jerarquía de métodos de pago.
6. Devoluciones.
7. Reversos.
8. Ajustes.
9. Transferencia compensatoria.
10. Comisiones.
11. Liquidaciones.
12. Conciliación.
13. Notificaciones al cliente.
14. Consulta posterior de pago sin cuenta.
