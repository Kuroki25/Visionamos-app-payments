# BUSINESS_RULES.md — Red Coopagos

**Versión:** 0.1  
**Fase:** 1 — Descubrimiento y modelado del negocio  
**Dependencias:** `BUSINESS_MODEL_RED_COOPAGOS.md`, `DOMAIN_GLOSSARY_RED_COOPAGOS.md`  
**Propósito:** Convertir el modelo de negocio en reglas explícitas, verificables y trazables antes de diseñar la arquitectura, base de datos y APIs.

---

# 1. Convenciones

Cada regla tiene uno de estos estados:

- **CONFIRMADA:** aprobada por la descripción actual del negocio.
- **PROPUESTA:** recomendada por consistencia, seguridad o trazabilidad; requiere validación funcional.
- **PENDIENTE:** no puede cerrarse todavía porque falta información de negocio.

Una regla `PENDIENTE` o `PROPUESTA` no debe convertirse automáticamente en una constraint, enum, endpoint o política definitiva.

---

# 2. Reglas de las superficies del producto

## BR-001 — Separación Backoffice / Portal Público

El Backoffice Administrativo y el Portal Público Principal son superficies distintas del producto.

- El Backoffice es privado y administrativo.
- El Portal Público es orientado al Cliente/Pagador.
- Las reglas críticas nunca deben depender únicamente de que una opción esté oculta en una de las interfaces.

**Estado:** CONFIRMADA.

---

## BR-002 — Fuente administrativa de verdad

Los Portales de Pago, Comercios Aliados, Categorías y demás configuración pública son creados y administrados desde el Backoffice.

El Portal Público debe consumir/reflejar la configuración válida administrada en el Backoffice y no mantener un catálogo administrativo independiente.

**Estado:** CONFIRMADA.

---

## BR-003 — Visibilidad pública controlada

Un Portal de Pago o Comercio Aliado solo debe aparecer en el Portal Público cuando cumpla las condiciones de estado/visibilidad definidas por el negocio.

Todavía debe decidirse si crear equivale a publicar o si existe un workflow explícito de borrador/publicación/despublicación.

**Estado:** PROPUESTA; workflow PENDIENTE.

---

# 3. Reglas de Portal y Comercio

## BR-004 — Pertenencia única del Comercio

Todo Comercio Aliado pertenece a un único Portal de Pago.

```text
Portal de Pago 1 ───────── N Comercio Aliado
Comercio Aliado N ──────── 1 Portal de Pago
```

Un Comercio no puede estar asociado simultáneamente a múltiples Portales en el alcance actual.

**Estado:** CONFIRMADA.

---

## BR-005 — Comercio y Aliado son el mismo concepto

Los términos `Comercio`, `Comercio Aliado` y `Aliado` utilizados en la UI no deben originar entidades de dominio duplicadas si representan a la misma organización afiliada.

El término canónico del dominio es **Comercio Aliado**.

**Estado:** CONFIRMADA.

---

## BR-006 — Categorías clasifican Comercios

Las Categorías se utilizan para clasificar Comercios Aliados.

No se crea en el alcance actual una categoría separada de Servicios por inferencia del frontend.

**Estado:** CONFIRMADA.

---

## BR-007 — Cardinalidad Comercio–Categoría

Debe definirse si un Comercio Aliado pertenece exactamente a una Categoría o si puede pertenecer a varias.

Hasta resolverlo no se debe fijar la cardinalidad física de la relación.

**Estado:** PENDIENTE.

---

# 4. Reglas de usuarios administrativos

## BR-008 — `AppUser` es administrativo

`AppUser` representa exclusivamente a una persona autenticada que accede al Backoffice.

No debe utilizarse `AppUser` como representación automática del Cliente/Pagador público.

**Estado:** CONFIRMADA.

---

## BR-009 — Roles administrativos actuales

Los roles administrativos base del alcance actual son:

```text
SUPERADMIN
ADMIN_PORTAL
ADMIN_COMMERCE
VIEWER
```

`CLIENT` no es un rol administrativo mientras el Cliente no tenga cuenta.

**Estado:** CONFIRMADA.

---

## BR-010 — Alcance global del Superadmin

`SUPERADMIN` puede administrar múltiples Portales de Pago y operar con alcance global de acuerdo con las políticas administrativas del sistema.

**Estado:** CONFIRMADA.

---

## BR-011 — Alcance del Admin Portal

`ADMIN_PORTAL` administra un Portal de Pago específico y únicamente los recursos subordinados que pertenezcan a ese Portal.

No debe poder acceder a otro Portal modificando `portalId`, rutas, parámetros, payloads o llamadas directas a la API.

**Estado:** CONFIRMADA.

---

## BR-012 — Alcance del Admin Comercio

`ADMIN_COMMERCE` administra un Comercio Aliado específico y únicamente los recursos subordinados autorizados de dicho Comercio.

No debe poder acceder a otro Comercio modificando `commerceId`, rutas, parámetros, payloads o llamadas directas a la API.

**Estado:** CONFIRMADA.

---

## BR-013 — Visor es solo lectura

`VIEWER` no puede crear, modificar, publicar, eliminar ni ejecutar acciones administrativas mutables sobre recursos.

Su scope exacto —global, Portal, Comercio u otra asignación— debe definirse.

**Estado:** CONFIRMADA parcialmente; scope PENDIENTE.

---

## BR-014 — Denegación por defecto

Si un usuario administrativo no tiene una asignación de rol/alcance que autorice expresamente una operación, el backend debe denegarla.

La ausencia de una restricción en el frontend no concede permiso.

**Estado:** CONFIRMADA como regla de seguridad derivada del modelo.

---

## BR-015 — Gestión de usuarios administrativos

El módulo `Usuarios` del Backoffice administra únicamente cuentas administrativas.

Debe definirse qué rol puede:

- crear usuarios;
- activar/desactivar usuarios;
- asignar roles;
- cambiar scopes;
- revocar accesos.

**Estado:** capacidad CONFIRMADA; matriz de autoridad PENDIENTE.

---

# 5. Reglas del Cliente/Pagador

## BR-016 — Pago sin cuenta

El Cliente puede iniciar y completar un pago desde el Portal Público sin registrarse, iniciar sesión ni disponer de una cuenta `AppUser`.

**Estado:** CONFIRMADA.

---

## BR-017 — Datos base del Pagador

Para el flujo actual se recopilan como datos base:

- correo electrónico;
- tipo de documento;
- número de documento;
- nombre;
- apellidos;
- celular.

Estos datos son independientes de los campos adicionales solicitados por el Formulario del Servicio.

**Estado:** CONFIRMADA.

---

## BR-018 — No crear credenciales del Cliente implícitamente

Capturar datos del Pagador no debe crear automáticamente una cuenta autenticable ni una contraseña.

Una futura funcionalidad de cuentas de cliente deberá diseñarse como una capacidad explícita y separada.

**Estado:** CONFIRMADA para el alcance actual.

---

## BR-019 — Persistencia de datos del Pagador

Los datos necesarios para trazabilidad de la operación deberán poder asociarse a la Transacción correspondiente.

Todavía debe definirse:

- si se almacenan como snapshot transaccional;
- si existe un registro reutilizable de pagador;
- periodo de retención;
- quién puede consultarlos;
- políticas de minimización y protección de PII.

**Estado:** necesidad CONFIRMADA; estrategia PENDIENTE.

---

# 6. Reglas de Servicios y Formularios

## BR-020 — Comercio ofrece Servicios

Un Comercio Aliado puede ofrecer uno o varios conceptos/Servicios susceptibles de pago.

La definición exacta de Servicio deberá alinearse con los flujos reales de los Comercios.

**Estado:** CONFIRMADA conceptualmente.

---

## BR-021 — Formulario específico por Servicio

Cuando un Servicio requiera información adicional, el Cliente debe diligenciar el Formulario configurado para ese Servicio antes de completar el flujo de pago.

**Estado:** CONFIRMADA.

---

## BR-022 — Datos base y formulario específico son diferentes

Los datos base del Pagador y los campos específicos del Servicio son conceptos diferentes.

Ejemplo:

```text
PayerData
- nombre
- documento
- email
- celular

FormSubmission
- código estudiante
- periodo
- referencia factura
```

No deben mezclarse arbitrariamente en un único modelo de usuario.

**Estado:** CONFIRMADA.

---

## BR-023 — Historial de formularios

Una modificación posterior del Formulario no debería cambiar el significado de los datos capturados en una operación histórica.

Se recomienda conservar una versión/snapshot de la definición utilizada por cada operación.

**Estado:** PROPUESTA de alta prioridad.

---

# 7. Reglas de cuota, obligación y monto

## BR-024 — Existencia de cuota u obligación

El flujo de pago parte de una cuota u obligación correspondiente al Cliente/Servicio.

**Estado:** CONFIRMADA.

---

## BR-025 — Origen de la obligación

Debe determinarse cómo obtiene Coopagos la cuota u obligación:

- carga previa;
- consulta a sistema externo del Comercio;
- cálculo interno;
- combinación de mecanismos.

Esta decisión condiciona contratos API, disponibilidad, cache, seguridad, idempotencia y modelo de datos.

**Estado:** PENDIENTE.

---

## BR-026 — Pago de la cuota

El Cliente puede pagar el valor de la cuota que le corresponde.

**Estado:** CONFIRMADA.

---

## BR-027 — Sobrepago

El Cliente puede pagar un valor superior a la cuota cuando la regla aplicable lo permita.

Deben definirse:

- límite máximo;
- cómo se aplica el excedente;
- si todos los Comercios/Servicios lo permiten;
- validaciones requeridas.

**Estado:** posibilidad CONFIRMADA; reglas PENDIENTES.

---

## BR-028 — Pago parcial

Todavía no se ha confirmado que un Cliente pueda pagar menos que la cuota.

No implementar pagos parciales hasta definir esta regla.

**Estado:** PENDIENTE.

---

# 8. Reglas de Métodos de Pago

## BR-029 — Catálogo de Métodos de Pago

Red Coopagos soporta conceptualmente Métodos de Pago como efectivo, tarjeta, PSE y billetera digital según la configuración e integraciones reales.

**Estado:** CONFIRMADA parcialmente.

---

## BR-030 — Habilitación de Métodos de Pago

Debe definirse en qué nivel se habilitan o restringen los Métodos de Pago:

- global;
- Portal de Pago;
- Comercio Aliado;
- Servicio;
- jerarquía combinada.

No implementar todavía una relación física definitiva.

**Estado:** PENDIENTE.

---

## BR-031 — No ofrecer métodos no autorizados

Una operación solo puede utilizar un Método de Pago habilitado para su contexto efectivo.

El backend debe validar esta regla independientemente de lo que muestre el frontend.

**Estado:** PROPUESTA/seguridad.

---

# 9. Reglas de Transacción

## BR-032 — Trazabilidad de la Transacción

Una Transacción debe poder identificar, cuando aplique:

- Portal de Pago;
- Comercio Aliado;
- Servicio;
- Pagador;
- cuota/obligación consultada;
- monto procesado;
- Método de Pago;
- referencia interna;
- referencia externa;
- estado;
- timestamps relevantes;
- datos de Formulario asociados.

**Estado:** CONFIRMADA conceptualmente.

---

## BR-033 — Estado controlado por workflow

El estado de una Transacción debe cambiar mediante transiciones válidas del proceso de pago y eventos autorizados, no mediante edición administrativa libre.

**Estado:** CONFIRMADA conceptualmente.

---

## BR-034 — Estados definitivos pendientes

Los valores concretos (`PENDING`, `PROCESSING`, `APPROVED`, etc.) no se fijarán hasta conocer el lifecycle real de los proveedores y operaciones.

**Estado:** PENDIENTE.

---

## BR-035 — Idempotencia de operaciones críticas

Una repetición técnica de una misma solicitud de pago no debe originar cobros duplicados cuando el proveedor/flujo permita aplicar idempotencia.

**Estado:** PROPUESTA de seguridad y consistencia; diseño posterior.

---

# 10. Reglas de incidencias y correcciones

## BR-036 — Preservar la historia original

Una incidencia posterior no debe resolverse alterando arbitrariamente la Transacción original para ocultar lo que ocurrió.

La operación original debe conservar su historia y cualquier corrección debe registrarse de forma trazable.

**Estado:** PROPUESTA de alta prioridad.

---

## BR-037 — Mecanismo de corrección financiera

Debe existir o evaluarse un flujo administrativo para resolver casos reportados por el Cliente cuando una operación requiera corrección financiera.

El mecanismo exacto todavía debe definirse entre reverso, devolución, reembolso, ajuste o transferencia compensatoria.

**Estado:** necesidad CONFIRMADA; mecanismo PENDIENTE.

---

## BR-038 — Devoluciones

La capacidad formal de devolución debe evaluarse antes de implementarse como entidad/proceso definitivo.

**Estado:** PENDIENTE.

---

## BR-039 — Liquidaciones

Debe confirmarse si Coopagos liquida fondos a los Comercios Aliados y, en caso afirmativo, cuáles son las reglas, periodicidad y cuentas destino.

**Estado:** PENDIENTE.

---

## BR-040 — Comisiones

Debe confirmarse si existen comisiones y en qué nivel se calculan/aplican.

**Estado:** PENDIENTE.

---

## BR-041 — Conciliación

Debe confirmarse si Coopagos ejecutará conciliación entre sus Transacciones y los registros de proveedores financieros/bancarios.

Dada la naturaleza del sistema, esta capacidad debe permanecer visible como requerimiento candidato y no perderse durante el diseño.

**Estado:** PENDIENTE DE CONFIRMACIÓN.

---

# 11. Reglas de seguridad derivadas del negocio

## BR-042 — Autorización en backend

Toda operación administrativa sensible debe validar rol, permiso, recurso y scope en backend.

Nunca confiar únicamente en:

- rutas ocultas;
- botones deshabilitados;
- IDs enviados por el frontend;
- datos guardados en el navegador.

**Estado:** CONFIRMADA.

---

## BR-043 — Aislamiento Portal

Un `ADMIN_PORTAL` no debe poder leer ni modificar información de otro Portal de Pago.

Esta regla debe probarse explícitamente contra ataques de acceso horizontal/BOLA.

**Estado:** CONFIRMADA.

---

## BR-044 — Aislamiento Comercio

Un `ADMIN_COMMERCE` no debe poder leer ni modificar información de otro Comercio Aliado.

Esta regla debe probarse explícitamente contra ataques de acceso horizontal/BOLA.

**Estado:** CONFIRMADA.

---

## BR-045 — Minimización de datos del Pagador

El sistema solo debe recopilar y exponer datos personales del Pagador necesarios para el flujo, trazabilidad y obligaciones aplicables.

El acceso administrativo a estos datos debe estar limitado según necesidad y scope.

**Estado:** PROPUESTA de seguridad/privacidad.

---

## BR-046 — Auditoría administrativa

Las operaciones administrativas críticas —como cambios de estado/visibilidad, cambios de roles/scopes y eventuales correcciones financieras— deben dejar evidencia auditable.

El catálogo definitivo de eventos de auditoría se definirá más adelante.

**Estado:** PROPUESTA de alta prioridad.

---

# 12. Preguntas que deben resolverse antes del modelo físico

1. ¿Crear un Portal/Comercio lo publica inmediatamente o existe borrador/publicación?
2. ¿Un Comercio puede pertenecer a múltiples Categorías?
3. ¿Quién puede crear cada tipo de usuario administrativo?
4. ¿Quién puede asignar o revocar roles/scopes?
5. ¿Cuál es el scope exacto del `VIEWER`?
6. ¿En qué nivel se configuran los Métodos de Pago?
7. ¿De dónde proviene la cuota/obligación?
8. ¿Se permiten pagos parciales?
9. ¿Cuáles son las reglas de sobrepago?
10. ¿Cuál es la máquina de estados real de una Transacción?
11. ¿Qué proveedores ejecutan cada Método de Pago?
12. ¿Qué significa exactamente una “transferencia” correctiva ante una incidencia?
13. ¿Hay devoluciones?
14. ¿Hay liquidaciones?
15. ¿Hay comisiones?
16. ¿Hay conciliación?
17. ¿Cuál es la política de retención/acceso de PII del Pagador?
18. ¿Todo Comercio debe tener al menos un Servicio?
19. ¿Un Servicio pertenece exclusivamente a un Comercio?
20. ¿Cuál es el workflow de activación/desactivación de Portal, Comercio y Servicio?

---

# 13. Criterio para pasar al diseño técnico

Antes de crear tablas o módulos NestJS definitivos, las reglas anteriores deben utilizarse para producir:

```text
ROLE_PERMISSION_MATRIX.md
USE_CASES.md
DOMAIN_MODEL.md
DOMAIN_RELATIONSHIPS.md
```

Las reglas `CONFIRMADAS` se convierten en invariantes/casos de uso candidatos. Las `PROPUESTAS` requieren validación y las `PENDIENTES` deben permanecer explícitas para evitar suposiciones silenciosas.

---

**Fin de BUSINESS_RULES.md v0.1**
