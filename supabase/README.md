# Base de datos Supabase

Las migraciones de este directorio son la fuente de verdad del esquema.

## Aplicación inicial

Hasta disponer de Supabase CLI enlazado, abre el editor SQL del proyecto,
pega el contenido completo de `migrations/20260724203000_initial_schema.sql` y
ejecútalo una sola vez.

La migración crea:

- entidades principales;
- restricciones e índices;
- aislamiento multiempresa mediante RLS;
- políticas de archivos;
- bucket privado `business-assets`;
- funciones auxiliares de autorización.

No ejecutes una migración parcialmente ni modifiques el esquema directamente
sin crear primero un nuevo archivo de migración.
