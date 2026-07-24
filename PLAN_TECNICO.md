# Plan técnico — Sistema de gestión de negocios

## 1. Objetivo del MVP

Construir una aplicación web multiempresa para que cada propietario pueda:

- iniciar sesión con una cuenta creada por el administrador principal;
- gestionar productos, categorías y métodos de pago;
- mantener manualmente la existencia actual de cada producto;
- registrar ventas con uno o varios productos;
- descontar existencias al confirmar una venta;
- anular ventas y restaurar sus existencias;
- consultar ventas, ganancias brutas, productos más vendidos y alertas de stock;
- utilizar el sistema desde móvil, tablet y escritorio.

El administrador principal podrá crear y administrar negocios y usuarios, modificar la identidad y configuración de cada negocio y consultar el registro de actividad.

Quedan fuera del MVP: registro público, gastos, proveedores, compras, kardex o historial de movimientos de inventario, facturación fiscal, múltiples sucursales, cuentas por cobrar, ventas sin conexión y exportaciones avanzadas.

## 2. Decisiones técnicas

### Aplicación

- Next.js con App Router y TypeScript.
- Renderizado del lado del servidor para las pantallas autenticadas y componentes cliente solo donde exista interacción.
- Tailwind CSS y componentes accesibles basados en shadcn/ui.
- Recharts para gráficos.
- React Hook Form y Zod para formularios y validación compartida.
- PWA responsive, instalable al final del MVP.

### Backend

- Supabase:
  - PostgreSQL como base de datos;
  - Auth para sesiones y contraseñas;
  - Storage para logotipos y fotografías;
  - Row Level Security (RLS) para aislar cada negocio;
  - funciones PostgreSQL transaccionales para confirmar y anular ventas.
- Vercel para despliegues de la aplicación.

### Convenciones

- El dinero se almacenará como `numeric(14,2)`, nunca como coma flotante.
- Las cantidades de producto serán enteros positivos.
- Las fechas se almacenarán en UTC y se presentarán usando la zona horaria del negocio.
- Las entidades usadas históricamente no se borrarán: se desactivarán.
- Una venta confirmada será inmutable. Para corregirla se anula y se crea otra.
- Los totales de venta se calcularán en el servidor; nunca se confiará en totales enviados por el navegador.

## 3. Arquitectura

Se utilizará un monolito modular:

```text
Navegador / PWA
      |
Next.js (UI, Server Actions, Route Handlers)
      |
Supabase (Auth, PostgreSQL, Storage, RLS, RPC)
```

Módulos funcionales:

```text
Autenticación
Administración
Negocios
Usuarios
Productos
Categorías
Métodos de pago
Ventas
Dashboard y reportes
Auditoría
```

Estructura prevista:

```text
src/
  app/
    (auth)/
    (owner)/
    admin/
    api/
  components/
  features/
    auth/
    businesses/
    users/
    products/
    sales/
    reports/
  lib/
    auth/
    database/
    validation/
    money/
  types/
supabase/
  migrations/
  seed.sql
  tests/
public/
```

## 4. Roles y autorización

### `super_admin`

- Acceso global.
- Crear, editar, activar y desactivar negocios.
- Crear usuarios y asignarlos a un negocio.
- Restablecer accesos y desactivar usuarios.
- Cambiar nombre, logo, moneda, zona horaria y datos del negocio.
- Acceder a información de soporte y auditoría.

### `owner`

- Acceso exclusivo a su negocio.
- Gestionar productos, categorías y métodos de pago.
- Registrar y anular ventas.
- Consultar dashboard y reportes.
- Cambiar su propia contraseña.

La autorización se aplicará en cuatro niveles:

1. middleware para impedir acceso a rutas no autenticadas;
2. layouts y navegación según rol;
3. validación en cada acción de servidor;
4. RLS en PostgreSQL como última barrera.

Ocultar un botón no se considerará una medida de seguridad.

## 5. Modelo de datos inicial

### Tablas principales

#### `businesses`

- `id`
- `name`
- `logo_path`
- `currency_code`
- `timezone`
- datos de contacto opcionales
- `status`
- `created_at`, `updated_at`

#### `profiles`

Extiende al usuario de Supabase Auth:

- `id` igual al ID de Auth
- `business_id`, nulo para el administrador principal
- `full_name`
- `role`: `super_admin` u `owner`
- `status`
- `must_change_password`
- `last_login_at`
- `created_at`, `updated_at`

#### `categories`

- `id`, `business_id`
- `name`, `description`
- `is_active`
- `display_order`
- marcas de tiempo

Restricción única por negocio para el nombre normalizado.

#### `payment_methods`

- `id`, `business_id`
- `name`
- `is_active`
- `display_order`
- marcas de tiempo

#### `products`

- `id`, `business_id`, `category_id`
- `name`, `sku`, `description`, `image_path`
- `cost_price`, `sale_price`
- `stock_quantity`
- `low_stock_threshold`
- `is_active`
- marcas de tiempo

Restricciones:

- precios mayores o iguales a cero;
- existencia y umbral mayores o iguales a cero;
- SKU único por negocio cuando exista.

#### `sales`

- `id`, `business_id`
- `sale_number`
- `sold_at`
- `subtotal`, `discount`, `total`
- `total_cost`, `gross_profit`
- `payment_method_id`
- copia histórica del nombre del método de pago
- `status`: `completed` o `voided`
- `note`
- `created_by`
- datos de anulación: usuario, fecha y motivo
- marcas de tiempo

#### `sale_items`

- `id`, `sale_id`, `product_id`
- copias históricas de nombre, SKU y categoría
- `quantity`
- `unit_cost`, `unit_price`
- `discount`, `subtotal`, `gross_profit`

#### `audit_logs`

- `id`, `business_id`, `actor_user_id`
- `action`
- `entity_type`, `entity_id`
- `before_data`, `after_data` en JSON
- `created_at`

La base de datos no tendrá una tabla de movimientos de inventario en el MVP. La trazabilidad disponible será la venta, la anulación y la auditoría de cambios manuales al producto.

## 6. Operaciones críticas

### Confirmar venta

Se ejecutará en una única transacción PostgreSQL:

1. validar usuario, negocio y método de pago;
2. bloquear las filas de los productos implicados;
3. comprobar que estén activos y tengan existencia suficiente;
4. tomar de la base de datos precios y costos vigentes;
5. calcular subtotales, descuentos, costo y ganancia;
6. crear cabecera y detalles históricos;
7. descontar existencias;
8. registrar auditoría;
9. confirmar toda la operación.

Si falla cualquier paso, no se guardará la venta ni se modificará el stock.

### Anular venta

Otra transacción:

1. comprobar que la venta está completada;
2. bloquear la venta y los productos;
3. marcarla como anulada;
4. restaurar las cantidades;
5. registrar responsable, fecha y motivo;
6. registrar auditoría.

La operación será idempotente para impedir una doble restauración.

### Edición manual de stock

Se realizará desde el formulario de producto. Aunque no habrá módulo de movimientos, el cambio anterior y el nuevo quedarán registrados en `audit_logs`.

## 7. Seguridad

- RLS activa en todas las tablas de negocio.
- Ningún propietario podrá elegir o cambiar su `business_id`.
- Las tareas administrativas de Auth se ejecutarán únicamente en servidor.
- La clave `service_role` nunca llegará al navegador.
- Buckets separados o rutas prefijadas por negocio para imágenes.
- Validación de tipo, tamaño y extensión de archivos.
- URLs firmadas si las imágenes no son públicas.
- Cookies seguras y protección de sesión provista por Supabase SSR.
- Rate limiting para inicio de sesión y acciones sensibles si el proveedor no lo cubre suficientemente.
- Registro de creación/desactivación de usuarios, cambios de negocio, cambios de stock y anulaciones.
- Confirmación explícita y motivo obligatorio para anular ventas.
- Pruebas automatizadas de aislamiento entre negocios.

## 8. Experiencia de usuario

### Propietario

- Escritorio: barra lateral; móvil: navegación inferior.
- Acción “Vender” destacada.
- Venta en dos paneles para escritorio/tablet y flujo compacto para móvil.
- Dashboard con periodo seleccionable.
- Productos como tabla en escritorio y tarjetas en móvil.
- Estados claros: disponible, stock bajo, agotado e inactivo.

### Administrador

- Área `/admin` separada visualmente.
- Listas de negocios y usuarios con búsqueda y filtros.
- Formularios para crear negocio y cuenta inicial.
- Indicador visible si en el futuro se implementa modo de soporte/impersonación.

## 9. Reportes del MVP

- total vendido;
- costo de productos vendidos;
- ganancia bruta;
- cantidad de ventas y unidades;
- ticket promedio;
- evolución diaria de ventas y ganancia;
- productos por unidades, facturación y ganancia;
- distribución por método de pago;
- productos agotados y con stock bajo;
- valor del inventario a costo.

Solo las ventas `completed` entrarán en las métricas. Los cálculos se resolverán mediante consultas o funciones SQL agregadas, con índices sobre negocio, fecha, estado y claves de relación.

## 10. Estrategia de pruebas

### Unitarias

- cálculos monetarios;
- descuentos;
- ganancias;
- validadores y permisos puros.

### Integración de base de datos

- políticas RLS;
- confirmación concurrente de ventas;
- stock insuficiente;
- rollback completo ante errores;
- anulación única y restauración correcta;
- aislamiento entre negocios.

### End-to-end

- acceso por rol;
- CRUD de producto;
- venta completa;
- intento de sobreventa;
- anulación;
- dashboard actualizado;
- creación de negocio y usuario por administrador.

### Calidad

- lint y comprobación de tipos;
- pruebas en anchos móvil, tablet y escritorio;
- accesibilidad básica con navegación por teclado y etiquetas;
- auditoría de rendimiento antes del lanzamiento.

## 11. Fases de implementación

### Fase 0 — Preparación y decisiones

Entregables:

- repositorio Git;
- documento de alcance confirmado;
- variables de entorno de desarrollo;
- proyecto Supabase y estrategia de ambientes;
- decisiones pendientes cerradas.

Criterio de salida: alcance, moneda, zona horaria inicial, reglas de descuento, formato de venta y política de imágenes aprobados.

### Fase 1 — Base técnica y diseño

- inicializar Next.js y dependencias;
- configurar TypeScript, estilos, componentes, lint y pruebas;
- definir tokens visuales y layouts responsive;
- preparar CI;
- configurar clientes Supabase para navegador y servidor.

Criterio de salida: aplicación base ejecutándose, CI en verde y layouts de acceso, propietario y administrador disponibles.

### Fase 2 — Datos, autenticación y permisos

- crear migraciones y tipos;
- configurar Auth sin registro público;
- implementar perfiles, roles y middleware;
- escribir políticas RLS;
- crear seed local;
- probar aislamiento multiempresa.

Criterio de salida: administrador y propietario ingresan solo a sus áreas y un propietario no puede leer ni modificar otro negocio.

### Fase 3 — Administración de negocios y usuarios

- panel administrativo;
- CRUD y activación de negocios;
- configuración de identidad;
- creación, edición, desactivación y restablecimiento de usuarios;
- carga de logotipos;
- auditoría administrativa.

Criterio de salida: el administrador puede preparar un negocio y entregar una cuenta funcional sin registro público.

### Fase 4 — Catálogo e inventario simple

- categorías y métodos de pago;
- CRUD de productos;
- carga y optimización de fotografías;
- existencia y umbral;
- filtros y estados de disponibilidad;
- auditoría de cambios manuales.

Criterio de salida: el propietario mantiene su catálogo y stock actual desde cualquier tamaño de pantalla.

### Fase 5 — Ventas transaccionales

- interfaz de punto de venta;
- carrito, cantidades y descuentos;
- función transaccional de confirmación;
- historial y detalle;
- función de anulación;
- manejo de concurrencia y errores.

Criterio de salida: las ventas descuentan stock de manera atómica, no permiten sobreventa y las anulaciones restauran una sola vez.

### Fase 6 — Dashboard y reportes

- indicadores y gráficos;
- filtros por fecha;
- rankings de productos;
- métricas por método de pago;
- alertas y valor de inventario;
- optimización de consultas.

Criterio de salida: todas las métricas coinciden con casos de prueba contables conocidos.

### Fase 7 — PWA, endurecimiento y lanzamiento

- manifiesto, iconos y comportamiento instalable;
- estados de carga/error y manejo de conexión;
- pruebas E2E y responsive;
- revisión de seguridad y accesibilidad;
- configuración de producción;
- copias de seguridad, monitoreo y procedimiento de recuperación;
- despliegue y smoke test.

Criterio de salida: versión de producción estable, instalable y verificada en móvil, tablet y escritorio.

## 12. Orden recomendado de entregas

Cada fase debe terminar en una versión demostrable:

1. acceso y separación por roles;
2. alta de negocio y propietario;
3. catálogo e inventario;
4. venta y anulación;
5. métricas;
6. PWA y producción.

No se construirá el dashboard final antes de estabilizar las ventas, porque sus cifras dependen de ese modelo.

## 13. Decisiones confirmadas para el MVP

- Se permitirán varios propietarios por negocio.
- El descuento será global por venta.
- Cada venta utilizará un único método de pago.
- El precio no podrá modificarse durante la venta.
- Cada negocio utilizará una sola moneda.
- El stock negativo estará prohibido.
- Se permitirán productos con precio de costo cero.
- Las fotografías aceptarán JPG, PNG y WebP, con un máximo de 5 MB.
- El administrador principal podrá consultar los datos financieros.
- La recuperación de acceso será gestionada por el administrador.
- El número de venta será una secuencia por negocio con formato `V-000001`.
- Los productos agotados no podrán venderse.
- Una venta confirmada no se editará: deberá anularse y crearse nuevamente.

## 14. Definición de terminado del MVP

El MVP estará terminado cuando:

- no exista registro público;
- cada propietario esté aislado en su negocio;
- el administrador gestione negocios y usuarios;
- productos, categorías y métodos de pago funcionen;
- el stock se edite manualmente y se actualice con ventas/anulaciones;
- las operaciones críticas sean transaccionales y estén probadas;
- reportes y ganancias coincidan con datos de control;
- la interfaz sea utilizable en móvil, tablet y escritorio;
- la aplicación sea instalable como PWA;
- existan migraciones reproducibles, pruebas, CI, monitoreo y respaldo;
- producción haya superado una prueba completa de punta a punta.
