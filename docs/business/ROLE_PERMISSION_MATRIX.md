# Red Coopagos — ROLE_PERMISSION_MATRIX

**Estado:** FASE 1 — Modelo de negocio  
**Versión:** actualizada con decisiones de autorización confirmadas  
**Propósito:** definir autorización del Backoffice Administrativo y separar explícitamente los accesos públicos del Portal Público.

---

## 1. Principio fundamental

Los roles de esta matriz pertenecen exclusivamente al **Backoffice Administrativo**.

El cliente/pagador del Portal Público:

- no es `AppUser`;
- no inicia sesión para pagar en el alcance actual;
- no posee roles administrativos;
- no puede acceder a endpoints administrativos;
- solo consume operaciones públicas necesarias para consultar la oferta y realizar un pago.

La autorización del Backoffice debe evaluarse como:

```text
PERMISO + ALCANCE (SCOPE) + RECURSO
```

No basta con verificar únicamente el nombre del rol.

---

## 2. Roles administrativos confirmados

| Código | Nombre | Alcance |
|---|---|---|
| `SUPERADMIN` | Superadministrador | Global |
| `ADMIN_PORTAL` | Administrador de Portal | Un portal específico |
| `ADMIN_COMMERCE` | Administrador de Comercio | Un comercio aliado específico |
| `VIEWER` | Visor | Recursos autorizados según scope |

> `CLIENT` no forma parte del IAM administrativo en el alcance actual.

> **Nota de consistencia:** no se crea un rol genérico `ADMIN` hasta que el negocio lo defina expresamente. Toda referencia informal a “admin” debe mapearse a uno de los roles formales anteriores.

---

## 3. Scopes

### GLOBAL
Permite actuar sobre toda la plataforma. Reservado inicialmente al `SUPERADMIN`.

### PORTAL
Restringe las operaciones a un `portalId` concreto y, por derivación, a sus categorías, comercios, servicios, formularios y transacciones.

### COMMERCE
Restringe las operaciones a un `commerceId` concreto y a los recursos subordinados a ese comercio.

### VIEW
Scope de lectura. Puede apuntar a un portal o comercio según la asignación realizada por el administrador autorizado.

---

## 4. Principios de autorización

1. Denegar por defecto.
2. El backend es la autoridad final.
3. Ocultar botones en frontend no constituye autorización.
4. Todo recurso subordinado debe validar pertenencia al scope.
5. Un `ADMIN_PORTAL` no puede operar sobre otro portal.
6. Un `ADMIN_COMMERCE` no puede operar sobre otro comercio.
7. Un comercio pertenece a un único portal.
8. Un `ADMIN_PORTAL` puede crear, actualizar y desactivar comercios de su portal, pero **no eliminarlos**.
9. Un `ADMIN_COMMERCE` trabaja únicamente sobre su comercio específico.
10. Un recurso no debe aceptarse como autorizado solo porque el frontend envía su ID.
11. Deben existir pruebas contra BOLA, BFLA, escalamiento horizontal y vertical.
12. Las operaciones críticas deben quedar auditadas.

---

# 5. Matriz de capacidades

Leyenda:

- ✅ Permitido.
- 🔒 Permitido solo dentro de su scope.
- 👁 Solo lectura.
- ❌ No permitido.
- 🟡 Pendiente de definición de negocio.

## 5.1 Usuarios administrativos

| Acción | SUPERADMIN | ADMIN_PORTAL | ADMIN_COMMERCE | VIEWER |
|---|---:|---:|---:|---:|
| Listar todos los usuarios administrativos | ✅ | ❌ | ❌ | ❌ |
| Ver usuarios de su ámbito | ✅ | 🔒 | 🔒 | ❌ |
| Crear Superadmin | ✅ | ❌ | ❌ | ❌ |
| Crear Admin Portal | ✅ | ❌ | ❌ | ❌ |
| Crear Admin Comercio | ✅ | 🔒 para comercios de su portal | ❌ | ❌ |
| Crear Visor | ✅ | 🔒 para su portal | 🔒 para su comercio | ❌ |
| Editar usuario de su ámbito | ✅ | 🔒 | 🔒 | ❌ |
| Activar/desactivar usuario de su ámbito | ✅ | 🔒 | 🔒 | ❌ |
| Asignar roles permitidos | ✅ | 🔒 limitado | 🔒 solo Viewer | ❌ |
| Cambiar scope | ✅ | 🔒 según reglas de reasignación | 🔒 solo Viewer de su comercio | ❌ |
| Eliminar definitivamente usuario | 🟡 | ❌ | ❌ | ❌ |
| Restablecer acceso | ✅ | 🔒 | 🔒 | ❌ |

### Reglas derivadas

- `ADMIN_PORTAL` puede crear `ADMIN_COMMERCE` únicamente para comercios que pertenezcan a su portal.
- `ADMIN_PORTAL` puede crear `VIEWER` limitado a su portal o a recursos subordinados autorizados.
- `ADMIN_COMMERCE` puede crear `VIEWER` limitado a su propio comercio.
- Ninguno de estos roles puede elevar privilegios por encima de su propio nivel.

---

## 5.2 Portales

| Acción | SUPERADMIN | ADMIN_PORTAL | ADMIN_COMMERCE | VIEWER |
|---|---:|---:|---:|---:|
| Listar portales | ✅ | 🔒 propio | ❌ | 👁 según scope |
| Ver detalle | ✅ | 🔒 propio | ❌ | 👁 según scope |
| Crear portal | ✅ | ❌ | ❌ | ❌ |
| Editar portal | ✅ | 🔒 propio | ❌ | ❌ |
| Activar/desactivar portal | ✅ | 🔒 propio | ❌ | ❌ |
| Publicar/despublicar portal | ✅ | 🔒 propio | ❌ | ❌ |
| Eliminar portal | 🟡 | ❌ | ❌ | ❌ |
| Ver métricas | ✅ | 🔒 propio | 🔒 derivadas | 👁 según scope |

**Decisión:** la publicación/despublicación de un portal puede ser ejecutada por `SUPERADMIN` y por el `ADMIN_PORTAL` del portal correspondiente.

---

## 5.3 Categorías de comercios

**Decisión confirmada:** las categorías son **específicas por portal** y clasifican comercios.

```text
Portal 1 ─── N Category
Category ─── Commerce
```

| Acción | SUPERADMIN | ADMIN_PORTAL | ADMIN_COMMERCE | VIEWER |
|---|---:|---:|---:|---:|
| Listar categorías | ✅ | 🔒 propio portal | 👁 propio ámbito | 👁 según scope |
| Crear categoría | ✅ | 🔒 propio portal | ❌ | ❌ |
| Editar categoría | ✅ | 🔒 propio portal | ❌ | ❌ |
| Activar/desactivar categoría | ✅ | 🔒 propio portal | ❌ | ❌ |
| Eliminar categoría | 🟡 | ❌ | ❌ | ❌ |
| Asignar categoría a comercio | ✅ | 🔒 propio portal | ❌ | ❌ |

Una categoría de Portal A no puede asignarse a un comercio de Portal B.

---

## 5.4 Comercios aliados

| Acción | SUPERADMIN | ADMIN_PORTAL | ADMIN_COMMERCE | VIEWER |
|---|---:|---:|---:|---:|
| Listar comercios | ✅ | 🔒 portal | 🔒 propio | 👁 según scope |
| Ver detalle | ✅ | 🔒 portal | 🔒 propio | 👁 según scope |
| Crear comercio | ✅ | 🔒 portal | ❌ | ❌ |
| Editar comercio | ✅ | 🔒 portal | 🔒 propio | ❌ |
| Asignar/cambiar categoría | ✅ | 🔒 portal | ❌ | ❌ |
| Activar/desactivar comercio | ✅ | 🔒 portal | 🔒 propio si se autoriza operativamente | ❌ |
| Publicar/despublicar comercio | ✅ | 🔒 portal | ❌ | ❌ |
| Eliminar comercio | 🟡 solo política superior | ❌ | ❌ | ❌ |
| Ver transacciones | ✅ | 🔒 portal | 🔒 propio | 👁 según scope |
| Ver reportes | ✅ | 🔒 portal | 🔒 propio | 👁 según scope |

### Invariantes

- El `ADMIN_PORTAL` tiene injerencia en **crear, actualizar, activar/desactivar y publicar/despublicar** comercios de su portal.
- El `ADMIN_PORTAL` **no elimina** comercios.
- El `ADMIN_COMMERCE` trabaja exclusivamente sobre su comercio específico.
- La eliminación física de comercios no se considera una operación ordinaria del negocio.

---

## 5.5 Servicios

| Acción | SUPERADMIN | ADMIN_PORTAL | ADMIN_COMMERCE | VIEWER |
|---|---:|---:|---:|---:|
| Listar servicios | ✅ | 🔒 portal | 🔒 propio | 👁 según scope |
| Crear servicio | ✅ | 🔒 portal | 🔒 propio | ❌ |
| Editar servicio | ✅ | 🔒 portal | 🔒 propio | ❌ |
| Activar/desactivar servicio | ✅ | 🔒 portal | 🔒 propio | ❌ |
| Configurar reglas de pago | ✅ | 🔒 portal | 🔒 propio | ❌ |
| Eliminar servicio | 🟡 | ❌ | ❌ | ❌ |

---

## 5.6 Formularios dinámicos

| Acción | SUPERADMIN | ADMIN_PORTAL | ADMIN_COMMERCE | VIEWER |
|---|---:|---:|---:|---:|
| Ver definiciones | ✅ | 🔒 portal | 🔒 propio | 👁 según scope |
| Crear formulario | ✅ | 🔒 portal | 🔒 propio | ❌ |
| Agregar/editar campos | ✅ | 🔒 portal | 🔒 propio | ❌ |
| Cambiar orden | ✅ | 🔒 portal | 🔒 propio | ❌ |
| Configurar validaciones | ✅ | 🔒 portal | 🔒 propio | ❌ |
| Crear nueva versión | ✅ | 🔒 portal | 🔒 propio | ❌ |
| Publicar versión | ✅ | 🔒 portal | ❌ | ❌ |
| Retirar versión | ✅ | 🔒 portal | ❌ | ❌ |
| Ver histórico | ✅ | 🔒 portal | 🔒 propio | 👁 según scope |

**Decisión:** la publicación formal del formulario corresponde a `SUPERADMIN` o `ADMIN_PORTAL`.
El `ADMIN_COMMERCE` puede trabajar el formulario de su comercio, pero no publicar una versión en el Portal Público salvo cambio futuro de negocio.

---

## 5.7 Métodos de pago

| Acción | SUPERADMIN | ADMIN_PORTAL | ADMIN_COMMERCE | VIEWER |
|---|---:|---:|---:|---:|
| Ver catálogo global | ✅ | 👁 | 👁 | 👁 |
| Crear método global | ✅ | ❌ | ❌ | ❌ |
| Activar/desactivar globalmente | ✅ | ❌ | ❌ | ❌ |
| Habilitar para portal | ✅ | 🔒* | ❌ | ❌ |
| Restringir para comercio | ✅ | 🔒* | 🔒* | ❌ |

\* Modelo exacto de habilitación pendiente de confirmación.

---

## 5.8 Transacciones

| Acción | SUPERADMIN | ADMIN_PORTAL | ADMIN_COMMERCE | VIEWER |
|---|---:|---:|---:|---:|
| Listar | ✅ | 🔒 portal | 🔒 propio | 👁 según scope |
| Ver detalle | ✅ | 🔒 portal | 🔒 propio | 👁 según scope |
| Filtrar/buscar | ✅ | 🔒 portal | 🔒 propio | 👁 según scope |
| Exportar datos | ✅ | 🔒 | 🔒 | 👁 solo Excel y según scope |
| Crear manualmente | ❌ | ❌ | ❌ | ❌ |
| Editar monto original | ❌ | ❌ | ❌ | ❌ |
| Cambiar estado arbitrariamente | ❌ | ❌ | ❌ | ❌ |
| Ejecutar corrección financiera | ✅ | 🔒** | ❌ | ❌ |
| Ver trazabilidad | ✅ | 🔒 | 🔒 | 👁 según scope |

**\*\*** Confirmado para `SUPERADMIN` y `ADMIN_PORTAL` dentro de su scope.
La referencia del negocio a un “admin” adicional queda pendiente hasta que exista un rol formal con ese nombre; no se crea silenciosamente.

### Viewer

El `VIEWER`:

- puede consultar información autorizada;
- puede exportar **datos a Excel**;
- no puede mutar recursos;
- toda exportación debe respetar scope y controles de PII.

---

## 5.9 Reportes

| Acción | SUPERADMIN | ADMIN_PORTAL | ADMIN_COMMERCE | VIEWER |
|---|---:|---:|---:|---:|
| Ver reporte global | ✅ | ❌ | ❌ | ❌ |
| Ver reporte de portal | ✅ | 🔒 propio | ❌ | 👁 según scope |
| Ver reporte de comercio | ✅ | 🔒 portal | 🔒 propio | 👁 según scope |
| Exportar Excel | ✅ | 🔒 | 🔒 | 👁 según scope |
| Editar/configurar reportes administrativos | ✅ | 🔒 si aplica | 🟡 | ❌ |

---

# 6. Operaciones del Portal Público

Estas operaciones no dependen de roles administrativos:

| Capacidad | Público |
|---|---:|
| Consultar portales publicados | ✅ |
| Consultar categorías del portal | ✅ |
| Consultar comercios publicados | ✅ |
| Consultar servicios habilitados | ✅ |
| Obtener formulario publicado | ✅ |
| Enviar datos del formulario | ✅ |
| Informar datos del pagador | ✅ |
| Consultar obligación/cuota | ✅ según modelo definitivo |
| Seleccionar monto permitido | ✅ |
| Seleccionar método de pago habilitado | ✅ |
| Iniciar pago | ✅ |
| Consultar resultado con identificador seguro | ✅ |
| Consultar recursos administrativos | ❌ |

---

# 7. Reasignación de scope — recomendación

La pregunta:

> ¿Un administrador puede ser reasignado entre scopes?

## Recomendación: SÍ, pero mediante una operación administrativa controlada

Ejemplo:

```text
ADMIN_PORTAL
Portal A
    ↓ reasignación autorizada
Portal B
```

La reasignación debe:

1. revocar inmediatamente el scope anterior;
2. asignar el nuevo scope de forma transaccional;
3. registrar quién hizo el cambio;
4. registrar scope anterior y nuevo;
5. impedir autoasignación de privilegios;
6. impedir que un administrador asigne scopes que él mismo no controla;
7. invalidar/recalcular permisos o sesión cuando sea necesario.

### Autoridades recomendadas

- `SUPERADMIN` puede reasignar `ADMIN_PORTAL` entre portales.
- `SUPERADMIN` puede reasignar `ADMIN_COMMERCE` entre comercios.
- `ADMIN_PORTAL` puede reasignar un `ADMIN_COMMERCE` **solo entre comercios de su propio portal**.
- `ADMIN_PORTAL` puede reasignar sus visores dentro de su portal.
- `ADMIN_COMMERCE` puede reasignar sus visores únicamente dentro de su comercio.
- Ningún usuario puede elevarse a sí mismo a un scope superior.

### Regla inicial recomendada

Un `ADMIN_PORTAL` o `ADMIN_COMMERCE` tendrá **un único scope operativo activo** a la vez, salvo que el negocio confirme posteriormente administración multi-scope.

---

# 8. Permisos candidatos

```text
admin_users.read
admin_users.create
admin_users.update
admin_users.manage_roles
admin_users.manage_scope

portals.read
portals.create
portals.update
portals.publish
portals.disable

categories.read
categories.create
categories.update
categories.disable

commerce.read
commerce.create
commerce.update
commerce.publish
commerce.disable

services.read
services.create
services.update
services.disable

forms.read
forms.create
forms.update
forms.publish

transactions.read
transactions.export
transactions.adjust

reports.read
reports.export
```

No convertir todavía esta lista en enum física definitiva.

---

# 9. Pendientes restantes

1. Confirmar si existe realmente un rol administrativo genérico adicional a `SUPERADMIN`, `ADMIN_PORTAL`, `ADMIN_COMMERCE` y `VIEWER`.
2. Confirmar quién puede eliminar definitivamente un comercio, si la eliminación física llega a existir.
3. Confirmar si `ADMIN_COMMERCE` puede desactivar su propio comercio o solo editar su contenido.
4. Confirmar modelo jerárquico de métodos de pago.
5. Confirmar qué tipo concreto de corrección financiera se aplicará.
6. Confirmar la recomendación de reasignación de scopes.
