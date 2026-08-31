# BUSINESS_MODEL.md — Red Coopagos

**Estado:** Borrador de dominio v0.2  
**Fase:** 1 — Descubrimiento y modelado del negocio  
**Propósito:** Fuente de verdad funcional previa al diseño de arquitectura, base de datos y APIs.

---

## 1. Convenciones de validación

Cada concepto de este documento se clasifica como:

- **CONFIRMADO:** definido expresamente por el negocio o respaldado directamente por el frontend y la descripción funcional.
- **INFERIDO DEL FRONTEND:** aparece o se deduce del prototipo actual, pero requiere validación de negocio antes de convertirse en entidad/regla definitiva.
- **PENDIENTE:** necesita definición antes de diseñar una implementación definitiva.

> Regla: ningún elemento marcado como INFERIDO o PENDIENTE debe transformarse automáticamente en tabla, endpoint, enum o regla de autorización.

---

# 2. Descripción del negocio

## 2.1 Definición consolidada

**Red Coopagos** es una plataforma de pagos organizada mediante **Portales**. Cada Portal administra una red de **Comercios Aliados**, tales como colegios, universidades, escuelas deportivas, hoteles u otras organizaciones.

Cada Comercio puede ofrecer uno o varios **Servicios** susceptibles de pago. Un Servicio puede requerir información específica del cliente antes de ejecutar el pago, por lo cual puede estar asociado a un **Formulario Dinámico** configurable.

Los pagos realizados en la plataforma generan **Transacciones** trazables que deben relacionar, cuando aplique, al cliente, portal, comercio, servicio, método de pago y datos recolectados para la operación.

La administración está controlada mediante usuarios, roles, permisos y alcance organizacional. Un usuario administrativo no debe obtener acceso global únicamente por poseer un rol; su acceso debe limitarse al Portal o Comercio que administra, salvo el Superadmin.

**Estado:** CONFIRMADO.

## 2.2 Superficies del producto

Red Coopagos diferencia explícitamente:

1. **Backoffice Administrativo:** panel privado donde se administran usuarios administrativos, Portales de Pago, Comercios Aliados, Categorías y operación.
2. **Portal Público Principal:** experiencia pública donde el Cliente navega por la oferta configurada y realiza pagos sin cuenta.
3. **Portal de Pago:** entidad de negocio creada en el Backoffice y mostrada en el Portal Público según su estado/visibilidad.

El Backoffice es la fuente de configuración administrativa para el catálogo público. La creación/administración de Portales y Comercios debe reflejarse en el Portal Público; el workflow exacto de publicación queda pendiente.

**Estado:** CONFIRMADO.

---

# 3. Jerarquía principal del negocio

```text
RED COOPAGOS
    │
    ├── Backoffice Administrativo
    │    ├── Usuarios administrativos / Identity & Access
    │    ├── Portales de Pago
    │    ├── Categorías de Comercio
    │    └── Comercios Aliados
    │
    └── Portal Público Principal
         └── publica la oferta administrada
              │
              ▼
         Portal de Pago
              │
              └── Comercio Aliado
                   ├── Categoría de Comercio
                   └── Servicio
                        ├── Formularios dinámicos
                        ├── Métodos de pago habilitados
                        └── Transacciones
```

Relación operacional principal:

```text
Cliente
   │
   └── realiza pago
          │
          ▼
      Transacción
          │
          ├── pertenece a un Portal
          ├── corresponde a un Comercio
          ├── corresponde a un Servicio
          ├── usa un Método de Pago
          └── puede contener una captura de Formulario
```

**Estado:** CONFIRMADO para Portal → Comercio y Transacción; Servicio y su relación formal se derivan de la necesidad confirmada de formularios por servicio y deben detallarse durante esta fase.

---

# 4. Lenguaje ubicuo inicial

## 4.1 Portal

Entidad organizacional principal de Red Coopagos que agrupa y administra Comercios Aliados.

Ejemplos presentes en el prototipo:

- Avanza
- Otrahuilca
- Coopenjo

Un Portal **no debe confundirse** con una categoría, un servicio individual ni un método de pago.

**Estado:** CONFIRMADO.

---

## 4.2 Comercio Aliado

Organización afiliada a un Portal que recibe pagos por uno o varios conceptos o servicios.

Ejemplos representados en el frontend:

- Colegio
- Universidad
- Hotel
- Clínica
- Instituto
- Escuela/academia
- Agencia
- Gimnasio
- Comercio

El frontend utiliza tanto **Aliado** como **Comercio**. Para el dominio se adopta provisionalmente el término oficial **Comercio Aliado** y se evita crear dos entidades distintas si representan el mismo concepto.

**Estado:** CONFIRMADO como concepto; terminología canónica pendiente de aprobación final.

---

## 4.3 Servicio

Concepto cobrable ofrecido por un Comercio Aliado.

Ejemplos potenciales:

- Matrícula
- Mensualidad
- Inscripción
- Reserva
- Consulta
- Membresía
- Cuota
- Factura

La existencia formal de Servicio se considera necesaria porque los formularios dinámicos se configuran **según cada servicio**, y distintos conceptos de pago pueden requerir datos diferentes.

**Estado:** CONFIRMADO conceptualmente por la descripción de negocio; estructura detallada PENDIENTE.

---

## 4.4 Categoría de Comercio

Clasificación utilizada exclusivamente para organizar los Comercios Aliados.

Ejemplos: Instituciones educativas, Hoteles, Deportes, Salud y otras categorías comerciales.

En el alcance actual no existe una categoría independiente para Servicios.

**Estado:** CONFIRMADO.

---

## 4.5 Cliente / Pagador

Actor público que realiza pagos desde el Portal Público Principal. No requiere cuenta ni autenticación y no forma parte de `AppUser`.

Datos base capturados actualmente: correo, tipo de documento, número de documento, nombre, apellidos y celular.

**Estado:** CONFIRMADO.

---

## 4.6 Transacción

Registro de una operación de pago realizada o intentada en el sistema.

El frontend actual maneja información como:

- referencia;
- fecha;
- concepto;
- método de pago;
- estado;
- valor;
- pagador.

Otra vista también contempla hora, tipo, monto y descripción. Estas representaciones deben unificarse en un único contrato de dominio.

**Estado:** CONFIRMADO.

---

## 4.7 Método de Pago

Mecanismo utilizado para ejecutar una operación de pago.

Métodos confirmados entre negocio y prototipo:

- Efectivo.
- Tarjeta.
- PSE.
- Billetera digital.
- Transferencia bancaria (presente en el prototipo; validar si forma parte del alcance productivo).

El prototipo contiene referencias genéricas a otros métodos que no deben considerarse requisitos reales sin validación.

**Estado:** CONFIRMADO parcialmente.

---

## 4.8 Formulario Dinámico

Definición configurable de datos que deben recopilarse para un Servicio antes o durante el flujo de pago.

El frontend entregado todavía no implementa un módulo funcional de formularios dinámicos, por lo que este subdominio debe diseñarse explícitamente.

Ejemplo:

```text
Comercio: Universidad X
Servicio: Pago de matrícula
Formulario:
- Código de estudiante
- Documento
- Periodo académico
- Programa
- Valor
```

El modelo deberá considerar versionamiento para impedir que cambios futuros alteren la interpretación histórica de transacciones anteriores.

**Estado:** CONFIRMADO; diseño detallado PENDIENTE.

---

## 4.9 Media / Imágenes

Recursos visuales asociados a elementos del sistema, como:

- logo de Portal;
- logo de Comercio;
- avatar de Usuario;
- imágenes de formularios/servicios;
- banners u otros recursos configurables.

Se usará provisionalmente el concepto **MediaAsset** en lugar de limitar el dominio a una entidad llamada Imagen.

**Estado:** CONFIRMADO como capacidad; modelo técnico PENDIENTE.

---

# 5. Actores y roles

El Backoffice Administrativo tendrá cuatro roles administrativos base en el alcance actual. El Cliente/Pagador es un actor público, no un rol de `AppUser`.

## 5.1 Superadmin

Control administrativo global de la plataforma.

Capacidades esperadas:

- administrar Portales;
- administrar Comercios;
- administrar Usuarios;
- administrar configuración global;
- consultar operaciones globales;
- administrar seguridad y permisos según política;
- acceder a reportes globales.

**Estado:** CONFIRMADO.

---

## 5.2 Admin Portal

Administra un Portal específico explícitamente asignado.

El rol por sí solo no otorga acceso a todos los Portales.

Ejemplo conceptual:

```text
Usuario: María
Rol: ADMIN_PORTAL
Scope: PORTAL
ScopeId: AVANZA
```

Puede administrar los Comercios y recursos que pertenecen a ese Portal autorizado.

**Estado:** CONFIRMADO.

---

## 5.3 Admin Comercio

Administra un Comercio Aliado específico explícitamente asignado.

Ejemplo conceptual:

```text
Usuario: Carlos
Rol: ADMIN_COMMERCE
Scope: COMMERCE
ScopeId: UNIVERSIDAD_X
```

No debe obtener acceso a otros Comercios cambiando identificadores en una petición.

**Estado:** CONFIRMADO.

---

## 5.4 Visor

Usuario administrativo con acceso de solo lectura a la información permitida dentro de su alcance.

Debe definirse si un Visor puede estar asignado a:

- toda la plataforma;
- un Portal;
- un Comercio;
- uno o varios recursos concretos.

**Estado:** CONFIRMADO como rol; alcance exacto PENDIENTE.

---

## 5.5 Cliente/Pagador — actor público, no rol administrativo

El Cliente no requiere cuenta en el alcance actual. Por tanto, no se modela como rol de `AppUser`. Utiliza el Portal Público como invitado y suministra sus datos durante el flujo de pago.

**Estado:** CONFIRMADO.

---

# 6. Inconsistencia detectada en los roles del frontend

El frontend actual utiliza:

```text
Administrador
Portal
Superadministrador
Comercio
Visor
```

El modelo de negocio objetivo establece:

```text
SUPERADMIN
ADMIN_PORTAL
ADMIN_COMMERCE
VIEWER
```

Por tanto:

- `Superadministrador` → corresponde conceptualmente a `SUPERADMIN`.
- `Portal` → debe convertirse en `ADMIN_PORTAL`.
- `Comercio` → debe convertirse en `ADMIN_COMMERCE`.
- `Visor` → corresponde a `VIEWER`.
- `Administrador` genérico → requiere eliminarse o redefinirse.
- `Cliente` no se incorpora como rol administrativo: es un actor público sin cuenta en el alcance actual.

**Regla:** no copiar los roles actuales del frontend directamente a la base de datos.

---

# 7. Autorización basada en rol + alcance

La autorización debe responder siempre:

```text
QUIÉN
puede hacer QUÉ
sobre QUÉ RECURSO
y dentro de QUÉ ALCANCE
```

Modelo conceptual inicial:

```text
AppUser
   │
   └── RoleAssignment
          ├── Role
          ├── ScopeType
          └── ScopeId
```

Ejemplos:

```text
ADMIN_PORTAL + Portal A
ADMIN_COMMERCE + Comercio B
VIEWER + Portal A
```

Esto evita implementar autorización únicamente mediante un `role` global dentro del usuario.

**Estado:** CONFIRMADO como requerimiento arquitectónico derivado del negocio y seguridad.

---

# 8. Matriz inicial de acceso

| Capacidad | Superadmin | Admin Portal | Admin Comercio | Visor | Cliente |
|---|---|---|---|---|---|
| Administrar sistema | Sí | No | No | No | No |
| Crear Portal | Sí | No* | No | No | No |
| Administrar Portal | Sí | Su alcance | No | Solo lectura | No |
| Crear Comercio | Sí | En su Portal | No* | No | No |
| Administrar Comercio | Sí | En su Portal | Su alcance | Solo lectura | No |
| Configurar Servicios | Sí | En su Portal | En su Comercio | No | No |
| Configurar Formularios | Sí | En su Portal | En su Comercio | No | No |
| Consultar Transacciones en Backoffice | Global | Portal | Comercio | Scope | No aplica |
| Ver Reportes administrativos | Global | Portal | Comercio | Scope | No aplica |
| Realizar pagos desde Portal Público | No aplica | No aplica | No aplica | No aplica | Actor público |

`*` Requiere validación final con el negocio.

---

# 9. Dominios funcionales iniciales

## 9.1 Identity & Access

Responsabilidades:

- AppUser;
- autenticación;
- roles;
- permisos;
- asignaciones con alcance;
- control de acceso;
- estado del usuario.

**Estado:** CONFIRMADO.

---

## 9.2 Portal Management

Responsabilidades:

- creación y administración de Portales;
- estado del Portal;
- branding/logo;
- asociación de administradores;
- relación con Comercios.

**Estado:** CONFIRMADO.

---

## 9.3 Commerce Management

Responsabilidades:

- alta y gestión de Comercios Aliados;
- información legal/comercial;
- contacto;
- ubicación;
- estado;
- relación con Portal;
- servicios ofrecidos.

El frontend también contiene información bancaria del aliado. Se considera candidata a un concepto separado, como `SettlementAccount`, debido a su sensibilidad y lifecycle independiente.

**Estado:** CONFIRMADO + elemento financiero INFERIDO.

---

## 9.4 Service Catalog

Responsabilidades:

- Servicios cobrables;
- categorías;
- estado/disponibilidad;
- relación Portal/Comercio;
- formularios requeridos;
- métodos de pago permitidos.

**Estado:** CONFIRMADO conceptualmente; reglas PENDIENTES.

---

## 9.5 Dynamic Forms

Responsabilidades:

- definición de formularios;
- campos;
- opciones;
- validaciones;
- orden;
- versiones;
- captura histórica asociada a una operación.

**Estado:** CONFIRMADO; no implementado todavía en el frontend.

---

## 9.6 Payments / Transactions

Responsabilidades:

- creación/intento de pago;
- asociación con Portal, Comercio y Servicio;
- método de pago;
- monto/moneda;
- referencia;
- estado;
- trazabilidad;
- idempotencia;
- consulta administrativa y por cliente.

**Estado:** CONFIRMADO.

---

## 9.7 Reporting

El frontend ya presenta informes y métricas a nivel global y por Comercio.

Debe definirse cuáles reportes son requisitos reales y cuáles son únicamente demostrativos.

**Estado:** INFERIDO DEL FRONTEND.

---

## 9.8 Financial Operations

El frontend distingue Transacciones de Movimientos y maneja tipos como:

- ingreso;
- egreso;
- comisión;
- devolución;
- liquidación;
- ajuste.

También muestra pagos aprobados, pendientes, rechazados y devoluciones.

Estos conceptos **no se convierten todavía en entidades definitivas**. Primero debe confirmarse si Coopagos realiza contabilidad operacional, conciliación, liquidación a comercios y devoluciones dentro de este sistema.

**Estado:** INFERIDO DEL FRONTEND.

---

# 10. Entidades/conceptos confirmados para profundizar

La siguiente lista representa candidatos de dominio confirmados, no tablas definitivas:

```text
AppUser
Role
Permission
RoleAssignment
Portal
Commerce
Service
CommerceCategory
PaymentMethod
Transaction
FormDefinition
FormField
MediaAsset
```

Conceptos que probablemente serán necesarios para formularios históricos:

```text
FormVersion
FormSubmission
```

**Estado:** `FormVersion` y `FormSubmission` son INFERIDOS por consistencia histórica y deben validarse en el diseño del subdominio.

---

# 11. Conceptos inferidos del frontend pendientes de validación

```text
FinancialMovement
Refund
Settlement
Commission
SettlementAccount
Notification
AuditLog
ReportDefinition / Report
PortalConfiguration
```

No crear tablas para estos conceptos hasta validar su responsabilidad real.

---

# 12. Relaciones iniciales del dominio

```text
Portal 1 ───────── N Commerce
Commerce 1 ─────── N Service
Commerce N ─────── 1 CommerceCategory [cardinalidad exacta por validar]
Service N ──────── N PaymentMethod      [por validar punto de configuración]
Service 1 ──────── N FormDefinition     [o una definición versionada]
PayerData ───────── Transaction          [el Cliente no requiere AppUser]
Service 1 ──────── N Transaction
Commerce 1 ─────── N Transaction
Portal 1 ───────── N Transaction
PaymentMethod 1 ── N Transaction
Transaction 0..1 ─ 1 FormSubmission     [por validar]
AppUser 1 ──────── N RoleAssignment
```

> Estas cardinalidades son un modelo conceptual de trabajo. No deben implementarse físicamente hasta validar casos de uso y lifecycle.

---

# 13. Reglas de negocio iniciales

## BR-001 — Pertenencia del Comercio

Todo Comercio Aliado operativo debe pertenecer a un Portal válido.

**Estado:** CONFIRMADO.

## BR-002 — Alcance del Admin Portal

Un Admin Portal solo puede gestionar el Portal específico que tenga asignado y sus recursos subordinados.

**Estado:** CONFIRMADO.

## BR-003 — Alcance del Admin Comercio

Un Admin Comercio solo puede gestionar el Comercio específico que tenga asignado y sus recursos subordinados.

**Estado:** CONFIRMADO.

## BR-004 — Cliente sin cuenta administrativa

El Cliente/Pagador no requiere una cuenta `AppUser` para iniciar o completar un pago en el Portal Público. Sus datos de pagador deben tratarse separadamente de la identidad administrativa.

**Estado:** CONFIRMADO.

## BR-005 — Servicio asociado al pago

Toda Transacción de pago debe identificar inequívocamente qué Servicio se está pagando.

**Estado:** CONFIRMADO conceptualmente.

## BR-006 — Trazabilidad organizacional

Una Transacción debe poder trazarse hasta el Portal y Comercio correspondientes al Servicio pagado.

**Estado:** CONFIRMADO.

## BR-007 — Método de pago válido

Una Transacción solo puede usar un Método de Pago habilitado para el contexto definido por el negocio.

El punto exacto de configuración (Portal, Comercio o Servicio) está PENDIENTE.

## BR-008 — Formulario por Servicio

Cuando un Servicio requiera datos adicionales, la operación debe utilizar la definición de Formulario vigente para dicho Servicio.

**Estado:** CONFIRMADO.

## BR-009 — Inmutabilidad histórica del formulario

Los cambios posteriores a un Formulario no deben modificar la interpretación de la información capturada en transacciones históricas.

**Estado:** regla propuesta, PENDIENTE de aprobación funcional.

## BR-010 — Denegación por defecto

La ausencia de una asignación de rol/alcance válida no debe conceder acceso implícito a Portales, Comercios ni Transacciones.

**Estado:** CONFIRMADO como política de seguridad.

## BR-011 — No confiar en identificadores del frontend

La autorización de Portal, Comercio, Cliente o Transacción debe comprobarse en backend, incluso si el frontend oculta las opciones no autorizadas.

**Estado:** CONFIRMADO como política de seguridad.

## BR-012 — Estados operativos

Portales, Comercios y Servicios requieren una política de estado que determine si pueden participar en nuevas operaciones.

Los estados y transiciones exactos están PENDIENTES.

---

# 14. Flujo funcional principal de pago — borrador

```text
1. Cliente entra al Portal Público Principal y selecciona un Portal de Pago / contexto de pago.
2. Selecciona Comercio Aliado.
3. Selecciona Servicio.
4. Sistema obtiene la configuración vigente del Servicio.
5. Sistema presenta el Formulario requerido, si existe.
6. Cliente suministra y valida los datos.
7. Sistema determina Métodos de Pago permitidos.
8. Cliente selecciona Método de Pago.
9. Backend crea/inicia una Transacción con protección de idempotencia.
10. Se ejecuta la integración correspondiente al método/proveedor.
11. Backend actualiza el estado de la Transacción de forma controlada.
12. Se registra trazabilidad/auditoría relevante.
13. Cliente recibe resultado/recibo.
```

**Estado:** PENDIENTE de validación detallada contra los proveedores y flujo real de pago.

---

# 15. Estados de Transacción detectados

El frontend usa dos conjuntos no equivalentes:

```text
aprobada
pendiente
rechazada
```

y:

```text
Exitosa
Rechazada
Pendiente
Cancelada
```

No se adoptará ninguno como enum definitivo.

Estados candidatos para análisis:

```text
PENDING
PROCESSING
APPROVED
REJECTED
CANCELLED
REFUNDED
```

El lifecycle debe derivarse del proceso real de pago y de las integraciones externas.

**Estado:** PENDIENTE.

---

# 16. Información actual del Comercio detectada en el frontend

El prototipo maneja:

### Identidad
- nombre comercial;
- razón social;
- identificación;
- tipo;
- estado;
- fecha de creación.

### Contacto
- responsable;
- correo;
- teléfono;
- dirección;
- ciudad.

### Información bancaria
- banco;
- tipo de cuenta;
- número de cuenta.

### Operación
- cantidad de transacciones;
- total procesado;
- última actividad;
- pagos aprobados;
- pagos pendientes;
- pagos rechazados;
- devoluciones;
- métodos de pago;
- movimientos;
- tendencia.

Los datos agregados/estadísticos no necesariamente pertenecen a la entidad `Commerce`; muchos deben calcularse mediante consultas o read models.

**Estado:** información administrativa CONFIRMADA parcialmente; datos financieros y métricas requieren validación.

---

# 17. Elementos del frontend que NO son fuente de verdad del backend

No se debe copiar automáticamente del prototipo:

- autenticación simulada mediante `localStorage`;
- JWT manual descrito en documentación genérica;
- endpoints de ejemplo como contrato definitivo;
- roles actuales sin corregir;
- estados inconsistentes;
- datos mock;
- países/monedas/configuraciones genéricas no confirmadas;
- criptomonedas u otros métodos no aprobados;
- límites transaccionales genéricos no confirmados;
- nombres de campos diseñados únicamente para la UI.

El frontend sirve como evidencia de **intención funcional**, no como modelo persistente.

---

# 18. Límites conceptuales importantes

Se deben mantener separadas las siguientes representaciones:

```text
Modelo de Dominio
≠
Modelo de Persistencia
≠
Contrato de API
≠
View Model del Frontend
```

Del mismo modo:

```text
Role
≠
Permission
≠
RoleAssignment
≠
Scope
```

Y:

```text
Transaction
≠
FinancialMovement
```

si el negocio confirma que ambos conceptos existen.

---

# 19. Preguntas abiertas prioritarias

Estas preguntas deben resolverse antes del diseño físico de la base de datos.

## P-001 — Relación Portal–Comercio
DECIDIDO: un Comercio Aliado pertenece a un único Portal de Pago.

## P-002 — Servicios
¿Todo Comercio debe tener al menos un Servicio? ¿Puede un mismo Servicio ser compartido entre varios Comercios?

## P-003 — Categorías
DECIDIDO: las Categorías clasifican únicamente Comercios Aliados.

## P-004 — Métodos de pago
¿Se habilitan globalmente, por Portal, por Comercio, por Servicio o en varios niveles con herencia?

## P-005 — Cliente
DECIDIDO: el Cliente puede pagar como invitado y no requiere cuenta.

## P-006 — Identificación del pagador
Datos base confirmados: correo, tipo de documento, número de documento, nombre, apellidos y celular. Falta definir retención, acceso y persistencia exacta.

## P-007 — Formularios
¿Puede un Servicio tener múltiples formularios simultáneos o únicamente una definición activa/versionada?

## P-008 — Formularios históricos
¿Es requisito conservar exactamente la versión y valores del formulario utilizado en cada pago?

## P-009 — Cuota / obligación y valores
DECIDIDO parcialmente: existe una cuota u obligación base y el Cliente puede pagar la cuota o, cuando la regla lo permita, un valor mayor. Falta definir de dónde obtiene Coopagos la obligación, si se permite pago parcial y cuáles son los límites/reglas del sobrepago.

## P-010 — Proveedores
¿Qué proveedores/gateways ejecutan PSE, tarjetas, billeteras, efectivo y transferencias?

## P-011 — Estados de pago
¿Cuál es el lifecycle real de una transacción y qué actor/proveedor puede cambiar cada estado?

## P-012 — Devoluciones
¿La plataforma ejecuta devoluciones o únicamente registra información recibida de un proveedor?

## P-013 — Liquidaciones
¿Coopagos liquida dinero a Comercios? Si sí, ¿cuál es la frecuencia, regla y responsable?

## P-014 — Comisiones
¿Existen comisiones por Portal, Comercio, Servicio, método de pago u otro nivel?

## P-015 — Cuenta bancaria
¿Los datos bancarios del Comercio se usan para liquidaciones? ¿Puede existir más de una cuenta y requieren aprobación/cambio auditado?

## P-016 — Visor
¿El Visor se asigna globalmente, a un Portal, a un Comercio o a múltiples scopes?

## P-017 — Admin Portal
DECIDIDO: un Admin Portal administra un Portal específico; el Superadmin administra múltiples Portales.

## P-018 — Admin Comercio
DECIDIDO: un Admin Comercio administra un Comercio Aliado específico.

## P-019 — Creación de usuarios
¿Quién puede crear cada tipo de usuario y quién puede asignar/revocar roles?

## P-020 — Auditoría
¿Qué operaciones regulatorias o críticas requieren un audit trail permanente?

## P-021 — Publicación Backoffice → Portal Público
¿La creación/activación de un Portal de Pago, Comercio Aliado o Categoría lo hace visible automáticamente en el Portal Público o existe un workflow explícito de borrador/publicación/despublicación?

---

# 20. Decisiones explícitamente diferidas

Todavía NO se decide:

- ORM;
- estructura de tablas;
- PK UUID vs otro identificador;
- estrategia exacta de sesiones/JWT;
- estructura de módulos NestJS definitiva;
- event-driven architecture;
- CQRS;
- microservicios;
- cache;
- Redis;
- colas;
- proveedor de almacenamiento;
- índices;
- particionamiento;
- enums físicos en PostgreSQL;
- soft delete;
- arquitectura de liquidaciones;
- arquitectura de conciliación.

Estas decisiones deben venir después del dominio y los casos de uso.

---

# 21. Fuente de verdad para la siguiente etapa

Para continuar la Fase 1 se deben producir, en este orden:

```text
1. DOMAIN_GLOSSARY.md
2. BUSINESS_RULES.md
3. ROLE_PERMISSION_MATRIX.md
4. USE_CASES.md
5. DOMAIN_MODEL.md
6. DOMAIN_RELATIONSHIPS.md
```

Solo después de validar esos documentos deberá comenzar el diseño de arquitectura objetivo y base de datos.

---

# 22. Resumen de estado

## Confirmado

- Red Coopagos organiza pagos mediante Portales.
- Los Portales administran Comercios Aliados.
- Los Comercios reciben pagos.
- Existen Servicios/conceptos cobrables.
- Los Servicios pueden requerir Formularios dinámicos.
- Existen Categorías.
- Existen Métodos de Pago.
- Los pagos generan Transacciones.
- Existe gestión de Usuarios.
- Roles administrativos objetivo: Superadmin, Admin Portal, Admin Comercio y Visor. El Cliente/Pagador no es un rol administrativo en el alcance actual.
- La autorización administrativa requiere alcance organizacional.
- El frontend contiene intención funcional útil, pero no es el modelo de persistencia.

## Inferido del frontend

- Movimientos financieros.
- Devoluciones.
- Liquidaciones.
- Comisiones.
- Cuenta de liquidación del Comercio.
- Reportes avanzados.
- Notificaciones.
- Auditoría visible en configuración.

## Pendiente

- lifecycle final de Transacción;
- cardinalidad exacta Comercio–Categoría;
- jerarquía de configuración de Métodos de Pago;
- reglas de Formularios y versionado;
- proveedores externos;
- conciliación/liquidación;
- persistencia/retención exacta de los datos del Pagador;
- reglas de tarifas/comisiones;
- política de estados de Portal, Comercio y Servicio;
- workflow exacto de publicación Backoffice → Portal Público.

---

**Fin de BUSINESS_MODEL.md v0.2**
