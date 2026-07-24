# Sistema Negocios

Aplicación web multiempresa para gestionar productos, inventario simple, ventas
y ganancias de pequeños negocios.

## Estado

La base técnica está terminada y el proyecto se encuentra en la Fase 2:
autenticación, modelo de datos y permisos. El alcance y las fases completas
están documentados en `PLAN_TECNICO.md`.

## Requisitos

- Node.js 24
- npm
- Un proyecto de Supabase para las fases de datos y autenticación

## Desarrollo local

1. Copia `.env.example` como `.env.local`.
2. Completa las variables de Supabase.
3. Instala las dependencias con `npm ci`.
4. Inicia el entorno con `npm run dev`.

La aplicación estará disponible normalmente en `http://localhost:3000`.

## Verificación

```text
npm run lint
npm run typecheck
npm run test
npm run build
```

También puede ejecutarse todo con `npm run check`.

## Rutas iniciales

- `/login`: acceso privado.
- `/dashboard`: superficie inicial del propietario.
- `/admin`: superficie inicial del administrador principal.

Las rutas están protegidas mediante sesiones Supabase SSR y autorización por
rol. El esquema, las políticas RLS y las instrucciones de migración están en
`supabase/`.

## Primer administrador

El comando `npm run admin:create` crea o sincroniza el primer
`super_admin` usando las variables temporales `INITIAL_ADMIN_EMAIL`,
`INITIAL_ADMIN_NAME` e `INITIAL_ADMIN_PASSWORD`.

La contraseña temporal debe eliminarse de `.env` inmediatamente después de
crear y comprobar la cuenta.
