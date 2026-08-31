# DOMAIN_GLOSSARY.md — Red Coopagos

**Versión:** 0.1  
**Fase:** 1 — Descubrimiento y modelado del negocio  
**Propósito:** Definir el lenguaje ubicuo de Red Coopagos y evitar que términos visuales, técnicos o de negocio se usen como sinónimos incorrectamente.

---

## 1. Regla de lenguaje ubicuo

Los términos de este documento son los nombres conceptuales que deben utilizarse durante el modelado del dominio. Un nombre del frontend, una ruta o un componente no crea por sí mismo una entidad del backend.

Se utilizarán tres estados:

- **CONFIRMADO:** definido explícitamente por el negocio.
- **INFERIDO:** deducido del frontend o del flujo, pendiente de confirmación final.
- **PENDIENTE:** requiere decisión de negocio.

---

# 2. Superficies del producto

## 2.1 Backoffice Administrativo

Aplicación privada de Red Coopagos utilizada para administrar la plataforma.

Es el panel de control desde el cual los usuarios administrativos pueden, según su rol y alcance:

- crear y administrar Portales de Pago;
- crear y administrar Comercios Aliados;
- categorizar Comercios Aliados;
- administrar servicios y configuración operativa cuando corresponda;
- administrar usuarios administrativos;
- consultar transacciones e información operacional;
- acceder a reportes;
- administrar configuraciones permitidas.

El módulo **Usuarios** del Backoffice gestiona exclusivamente usuarios administrativos. No representa a los clientes/pagadores del Portal Público.

**Estado:** CONFIRMADO.

---

## 2.2 Portal Público Principal

Aplicación pública orientada al cliente/pagador.

Muestra la oferta que ha sido configurada desde el Backoffice, incluyendo los Portales de Pago y sus Comercios Aliados visibles/activos.

El cliente puede navegar, seleccionar el contexto de pago, diligenciar la información requerida y realizar el pago sin crear una cuenta.

El Portal Público **no es la fuente administrativa de verdad** de Portales, Comercios ni Categorías; consume la configuración administrada desde el Backoffice.

**Estado:** CONFIRMADO.

---

## 2.3 Portal de Pago

Entidad de negocio creada y administrada desde el Backoffice y expuesta en el Portal Público cuando cumple las condiciones de publicación/visibilidad definidas por el negocio.

Un Portal de Pago agrupa Comercios Aliados.

Ejemplos mencionados en el proyecto incluyen portales como Avanza.

**No confundir con:**

- Backoffice Administrativo;
- Portal Público Principal;
- Comercio Aliado;
- Servicio.

**Estado:** CONFIRMADO.

---

# 3. Organización comercial

## 3.1 Comercio Aliado

Organización afiliada a un único Portal de Pago y administrada desde el Backoffice.

En el frontend también aparece el término **Aliado**. En el dominio, `Comercio Aliado` y `Aliado` se refieren al mismo concepto y no deben convertirse en dos entidades diferentes.

Ejemplos:

- universidad;
- colegio;
- hotel;
- escuela de fútbol;
- clínica;
- gimnasio;
- otra organización afiliada.

### Regla de pertenencia

Un Comercio Aliado pertenece a **un solo Portal de Pago**.

```text
Portal de Pago 1 ─────── N Comercios Aliados
Comercio Aliado N ────── 1 Portal de Pago
```

**Estado:** CONFIRMADO.

---

## 3.2 Categoría de Comercio

Clasificación utilizada para organizar los Comercios Aliados dentro de la oferta pública y administrativa.

Ejemplos:

- Instituciones educativas;
- Hoteles;
- Deportes;
- Salud;
- Restaurantes.

Las Categorías **clasifican Comercios Aliados, no Servicios**.

Por el momento se utilizará el término conceptual `CommerceCategory` / `Categoría de Comercio` para evitar crear una taxonomía de Servicios que el negocio no ha solicitado.

**Estado:** CONFIRMADO.

---

## 3.3 Servicio

Concepto, obligación o tipo de pago que un Comercio Aliado pone a disposición del cliente.

Ejemplos posibles:

- matrícula;
- mensualidad;
- cuota;
- inscripción;
- reserva;
- factura.

Un Comercio Aliado puede ofrecer uno o varios Servicios.

El Servicio puede determinar qué formulario debe diligenciarse y qué proceso debe utilizarse para identificar la obligación o cuota a pagar.

La estructura final de Servicio todavía debe validarse contra los flujos reales de cada Comercio.

**Estado:** CONFIRMADO conceptualmente; detalle PENDIENTE.

---

# 4. Identidad y actores

## 4.1 Usuario Administrativo (`AppUser`)

Persona autenticada que accede al Backoffice Administrativo.

`AppUser` representa únicamente cuentas administrativas del sistema.

Un `AppUser` puede recibir un rol y un alcance de autorización.

**No representa al cliente/pagador público.**

**Estado:** CONFIRMADO.

---

## 4.2 Cliente / Pagador

Persona que utiliza el Portal Público para realizar un pago.

Actualmente el Cliente:

- no necesita cuenta;
- no necesita contraseña;
- no es un `AppUser`;
- puede iniciar y completar un pago como invitado.

Durante el flujo de pago se recopilan, por el momento, estos datos base:

- correo electrónico;
- tipo de documento;
- número de documento;
- nombre;
- apellidos;
- celular.

Adicionalmente puede diligenciar campos específicos requeridos por el Servicio/Formulario.

**Estado:** CONFIRMADO.

---

## 4.3 Datos del Pagador (`PayerData`)

Conjunto de datos personales capturados durante una operación de pago para identificar al Cliente/Pagador.

`PayerData` es un concepto de dominio diferente de `AppUser`.

Por ahora no se asume la existencia de una cuenta o perfil reutilizable de cliente. El diseño posterior deberá decidir si estos datos se conservan únicamente como snapshot de la Transacción o si existe otro registro operacional justificable.

**Estado:** CONFIRMADO como información necesaria; persistencia exacta PENDIENTE.

---

# 5. Roles administrativos

## 5.1 Superadmin (`SUPERADMIN`)

Usuario administrativo con alcance global sobre la plataforma.

Puede administrar múltiples Portales de Pago y los recursos subordinados que las políticas le permitan.

**Estado:** CONFIRMADO.

---

## 5.2 Admin Portal (`ADMIN_PORTAL`)

Usuario administrativo asignado a un Portal de Pago específico.

Administra únicamente ese Portal y los recursos que pertenecen a su alcance.

No obtiene acceso a otros Portales cambiando identificadores en una petición.

**Estado:** CONFIRMADO.

---

## 5.3 Admin Comercio (`ADMIN_COMMERCE`)

Usuario administrativo asignado a un Comercio Aliado específico.

Administra únicamente el Comercio Aliado que le pertenece/asigna el sistema y los recursos subordinados autorizados.

**Estado:** CONFIRMADO.

---

## 5.4 Visor (`VIEWER`)

Usuario administrativo con acceso de solo lectura dentro del alcance que se le asigne.

Debe definirse posteriormente si el alcance puede ser global, Portal, Comercio u otra combinación controlada.

**Estado:** CONFIRMADO como rol; alcance exacto PENDIENTE.

---

## 5.5 Cliente NO es un rol administrativo

Aunque en una definición inicial se utilizó `CLIENT` como posible rol, la aclaración actual del negocio establece que el Cliente no necesita cuenta en el Backoffice ni autenticación para pagar.

Por tanto, en el alcance actual:

```text
CLIENT ≠ AppUser Role
```

El Cliente es un **actor público/pagador**, no un rol del módulo administrativo de Usuarios.

Esta decisión podrá revisarse en el futuro si Red Coopagos incorpora cuentas de clientes.

**Estado:** CONFIRMADO para el alcance actual.

---

# 6. Autorización

## 6.1 Rol

Conjunto administrativo de capacidades generales.

Roles actuales confirmados:

```text
SUPERADMIN
ADMIN_PORTAL
ADMIN_COMMERCE
VIEWER
```

**Estado:** CONFIRMADO.

---

## 6.2 Permiso

Capacidad granular sobre una acción administrativa, por ejemplo consultar, crear, actualizar, publicar o administrar un determinado recurso.

El catálogo definitivo de permisos se construirá en `ROLE_PERMISSION_MATRIX.md`.

**Estado:** CONFIRMADO conceptualmente.

---

## 6.3 Alcance (`Scope`)

Límite organizacional dentro del cual es válida una autorización.

Ejemplos:

```text
SUPERADMIN  → GLOBAL
ADMIN_PORTAL → PORTAL:{portalId}
ADMIN_COMMERCE → COMMERCE:{commerceId}
VIEWER → scope autorizado
```

**Estado:** CONFIRMADO.

---

# 7. Publicación del catálogo

## 7.1 Publicación / Visibilidad

Capacidad que determina qué configuración creada en el Backoffice puede mostrarse en el Portal Público.

El negocio confirma que los Portales de Pago y Comercios creados/administrados en el Backoffice son los que deben reflejarse en la experiencia pública.

Todavía debe definirse si:

- la creación publica automáticamente;
- existe un estado borrador;
- un administrador debe ejecutar una acción explícita de publicación;
- existen fechas de activación/desactivación.

Por seguridad y control operacional, estos detalles no deben inventarse en la base de datos antes de definir el workflow.

**Estado:** capacidad CONFIRMADA; lifecycle PENDIENTE.

---

# 8. Formularios

## 8.1 Formulario Dinámico (`FormDefinition`)

Configuración de los datos específicos que un Cliente debe suministrar para un Servicio.

No sustituye los datos base del Pagador.

Ejemplo:

```text
Datos base del pagador
- nombre
- apellidos
- documento
- email
- celular

Datos específicos del Servicio
- código de estudiante
- periodo académico
- número de factura
- referencia de obligación
```

**Estado:** CONFIRMADO.

---

## 8.2 Campo de Formulario (`FormField`)

Elemento configurable de un Formulario Dinámico.

Puede definir información como etiqueta, tipo de dato, obligatoriedad, reglas de validación, opciones y orden.

Los tipos concretos de campos todavía deben definirse.

**Estado:** CONFIRMADO conceptualmente.

---

## 8.3 Versión de Formulario (`FormVersion`)

Snapshot/versionamiento de una definición de formulario para conservar la interpretación histórica de una transacción aunque el formulario sea modificado posteriormente.

**Estado:** INFERIDO y fuertemente recomendado; pendiente de aprobación formal.

---

## 8.4 Respuesta de Formulario (`FormSubmission`)

Valores diligenciados por el Cliente para una operación concreta.

Debe poder relacionarse con la Transacción o intento de pago correspondiente sin alterar respuestas históricas cuando cambie el formulario.

**Estado:** INFERIDO y fuertemente recomendado.

---

# 9. Obligación y monto

## 9.1 Cuota / Obligación de Pago

Valor que el Cliente tiene pendiente o disponible para pagar dentro de un Servicio.

El negocio ha indicado que existe una cuota que corresponde al Cliente y que este puede pagar la cuota correspondiente o, cuando la regla lo permita, un valor mayor.

Todavía debe determinarse de dónde proviene la obligación:

- información previamente cargada por el Comercio;
- consulta a una API/sistema externo;
- cálculo interno;
- combinación de mecanismos.

No se adopta todavía una entidad física llamada `PaymentObligation`, `Debt`, `Invoice` o `Receivable` hasta comprender el flujo real.

**Estado:** CONFIRMADO como concepto; representación PENDIENTE.

---

## 9.2 Sobrepago

Pago por un valor superior a la cuota u obligación base.

El negocio ha indicado que puede permitirse pagar más de la cuota correspondiente, pero faltan reglas sobre límites, aplicación del excedente y casos permitidos.

**Estado:** CONFIRMADO como posibilidad; reglas PENDIENTES.

---

## 9.3 Pago Parcial

Pago por un valor inferior a la cuota.

No ha sido confirmado.

**Estado:** PENDIENTE.

---

# 10. Pagos y transacciones

## 10.1 Transacción

Registro trazable de un intento/operación de pago procesado por Red Coopagos.

Debe permitir reconstruir, cuando aplique:

- Portal de Pago;
- Comercio Aliado;
- Servicio;
- Pagador;
- obligación/cuota consultada;
- monto solicitado/pagado;
- Método de Pago;
- datos específicos del formulario;
- referencia interna/externa;
- estado;
- timestamps relevantes.

**Estado:** CONFIRMADO.

---

## 10.2 Estado de Transacción

Estado controlado por el lifecycle real del procesamiento del pago.

No debe tratarse como un campo editable libremente por un administrador.

Los estados definitivos y sus transiciones se definirán después de conocer el flujo real con los proveedores de pago.

**Estado:** CONFIRMADO como concepto; máquina de estados PENDIENTE.

---

## 10.3 Método de Pago (`PaymentMethod`)

Mecanismo mediante el cual se ejecuta un pago.

Ejemplos actuales del alcance funcional:

- efectivo;
- tarjeta;
- PSE;
- billetera digital.

Todavía debe definirse en qué nivel se habilitan los métodos:

- catálogo global de Coopagos;
- por Portal de Pago;
- por Comercio Aliado;
- por Servicio;
- combinación jerárquica.

**Estado:** CONFIRMADO como concepto; política de habilitación PENDIENTE.

---

# 11. Correcciones financieras y post-operación

## 11.1 Corrección / Reverso / Devolución / Transferencia compensatoria

El negocio requiere contemplar el escenario donde un Cliente reporta un problema y debe existir un mecanismo administrativo para corregir financieramente la situación.

No debe resolverse modificando arbitrariamente la historia de la Transacción original.

El término y proceso exactos todavía deben definirse entre:

- reverso;
- devolución;
- reembolso;
- ajuste;
- transferencia compensatoria.

**Estado:** necesidad CONFIRMADA; mecanismo PENDIENTE.

---

## 11.2 Conciliación

Proceso que compara los registros internos de Coopagos con los registros de bancos, gateways, adquirentes u otros proveedores para detectar diferencias de monto, estado, existencia o duplicidad.

Aún no se ha confirmado formalmente que Coopagos implemente conciliación, pero dada la naturaleza de pagos debe mantenerse como capacidad candidata de alta relevancia.

**Estado:** PENDIENTE DE CONFIRMACIÓN.

---

## 11.3 Liquidación

Proceso mediante el cual los fondos recaudados se distribuyen o transfieren al Comercio/beneficiario correspondiente según las reglas del negocio.

**Estado:** PENDIENTE DE CONFIRMACIÓN.

---

## 11.4 Comisión

Cargo o participación económica asociada a una operación, Portal, Comercio, Método de Pago u otro concepto.

El frontend la sugiere, pero el negocio aún no ha confirmado reglas de comisión.

**Estado:** PENDIENTE DE CONFIRMACIÓN.

---

# 12. Media

## 12.1 Recurso Multimedia (`MediaAsset`)

Archivo o referencia de almacenamiento utilizado por entidades del sistema, por ejemplo:

- logo de Portal de Pago;
- logo de Comercio Aliado;
- imagen pública;
- avatar de usuario administrativo cuando aplique.

No implica almacenar necesariamente el binario dentro de PostgreSQL.

**Estado:** CONFIRMADO como capacidad.

---

# 13. Términos que NO deben confundirse

```text
Backoffice Administrativo
    ≠ Portal Público Principal
    ≠ Portal de Pago
```

```text
AppUser / Usuario Administrativo
    ≠ Cliente / Pagador
```

```text
Comercio Aliado
    = Aliado (término UI)
```

```text
Categoría de Comercio
    ≠ Servicio
```

```text
Transacción
    ≠ Corrección financiera
    ≠ Liquidación
    ≠ Conciliación
```

```text
Rol
    ≠ Permiso
    ≠ Alcance
```

---

# 14. Relaciones conceptuales confirmadas

```text
Backoffice Administrativo
        │ configura/publica
        ▼
Portal Público Principal
```

```text
Portal de Pago 1 ───────── N Comercio Aliado
```

```text
Categoría de Comercio 1 ── N Comercio Aliado
```

> La cardinalidad exacta de Categoría debe verificarse si en el futuro un Comercio puede tener múltiples categorías.

```text
Comercio Aliado 1 ──────── N Servicio
```

```text
Cliente/Pagador ───────────► Transacción
(no requiere AppUser)
```

```text
AppUser ─────► RoleAssignment ─────► Role + Scope
```

---

# 15. Decisiones que este glosario corrige respecto al borrador inicial

1. `Cliente` deja de tratarse como rol administrativo en el alcance actual.
2. `AppUser` queda reservado a usuarios autenticados del Backoffice.
3. `Categoría` clasifica Comercios, no Servicios.
4. Un Comercio pertenece a un único Portal de Pago.
5. Un `ADMIN_PORTAL` administra un Portal específico; el `SUPERADMIN` tiene alcance global/múltiples Portales.
6. Un `ADMIN_COMMERCE` administra un Comercio específico.
7. El Backoffice es la fuente de configuración de los Portales/Comercios que se muestran en el Portal Público.
8. El Cliente puede pagar sin cuenta.
9. Los datos del Pagador deben separarse del modelo de identidad administrativa.
10. La cuota/obligación aparece como concepto de negocio previo a la Transacción, aunque su representación técnica todavía no está definida.

---

# 16. Preguntas abiertas que pasan a BUSINESS_RULES.md

1. ¿La creación de un Portal/Comercio lo publica automáticamente o existe workflow de publicación?
2. ¿Un Comercio pertenece exactamente a una categoría o puede tener varias?
3. ¿Quién puede crear cada clase de usuario administrativo?
4. ¿Quién puede asignar/cambiar roles?
5. ¿Cuál es el alcance exacto de `VIEWER`?
6. ¿En qué nivel se habilitan los Métodos de Pago?
7. ¿De dónde obtiene Coopagos la cuota/obligación?
8. ¿Se permiten pagos parciales?
9. ¿Qué límites existen para sobrepagos?
10. ¿Cuál es el lifecycle real de una Transacción?
11. ¿Qué proveedor/evento determina que un pago es exitoso o fallido?
12. ¿Cuál es el mecanismo exacto de corrección posterior a una incidencia?
13. ¿Existen devoluciones formales?
14. ¿Existen liquidaciones?
15. ¿Existen comisiones?
16. ¿Existe conciliación financiera?
17. ¿Cuánto tiempo deben conservarse los datos personales del pagador y quién puede consultarlos?

---

**Fin de DOMAIN_GLOSSARY.md v0.1**
