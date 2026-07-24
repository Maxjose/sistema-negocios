# Sistema Negocios

Aplicación web multiempresa para gestionar productos, inventario simple, ventas
y ganancias de pequeños negocios.

## Estado

El proyecto se encuentra en la Fase 1: base técnica y diseño. El alcance y las
fases completas están documentados en `PLAN_TECNICO.md`.

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

La protección real de rutas y la conexión con Supabase se implementarán en la
Fase 2.
