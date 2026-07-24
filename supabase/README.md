# Base de datos Supabase

Las migraciones de este directorio son la fuente de verdad del esquema.

## Aplicación inicial

Hasta disponer de Supabase CLI enlazado, abre el editor SQL del proyecto y
ejecuta una sola vez cada archivo de `migrations/`, en orden ascendente por
nombre.

La migración crea:

- entidades principales;
- restricciones e índices;
- aislamiento multiempresa mediante RLS;
- políticas de archivos;
- bucket privado `business-assets`;
- funciones auxiliares de autorización.
- bloqueo de acceso cuando el negocio está inactivo.

No ejecutes una migración parcialmente ni modifiques el esquema directamente
sin crear primero un nuevo archivo de migración.
