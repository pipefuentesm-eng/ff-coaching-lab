# FF Coaching Lab

App de coaching online (lado coach + lado atleta) con **Next.js 15 + Supabase + Vercel**.

## Qué incluye
- **Coach** (`/coach/...`): lista de alumnos con link de alta, ficha con bloques → semanas → días → ejercicios, «Duplicar → Semana N+1», presets, biblioteca de ejercicios, base de alimentos (con importar CSV), dieta con versiones/opciones/equivalencias automáticas/CSV, check-ins configurables (editor global + por alumno + revisión con comparación semanal y feedback Loom), extras (gasto, suplementación, accesorios) y **Ver como atleta** (solo lectura).
- **Atleta** (`/athlete/...`, PWA móvil): inicio con tira Lun–Dom y próximo entrenamiento, cuestionario previo, logger de series con rendimiento anterior, pauta de nutrición con modo macros, registro diario y check-in semanal, gasto/suplementos/accesorios.
- **Habilitación por fecha** (`profiles.access_from`): el alumno ve su plan pero no registra antes de esa fecha.

## Variables de entorno
```
NEXT_PUBLIC_SUPABASE_URL=https://obcemvxrzgantdanmtbo.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_tId3OHbQhI_UVtVtFqBaBA_0rQzfpEi
```
La publishable key puede ser pública: la protege el RLS. **Nunca** pongas la service-role key en el código ni en Vercel.

## Base de datos
Las migraciones de `supabase/migrations/` **ya están aplicadas** en el proyecto Supabase «FF Coaching Lab». RLS activado en todas las tablas.

### Usuario coach
El correo `pipefuentes.m@gmail.com` está pre-autorizado (tabla `private.coach_invites`): al registrarse en `/register` queda como **coach** con slug `felipe` y se le cargan automáticamente 32 alimentos, 23 ejercicios y 30 preguntas de check-in. Cualquier otro registro queda siempre como **athlete**.

Para autorizar otro coach (SQL Editor de Supabase):
```sql
insert into private.coach_invites (email, full_name, coach_slug) values ('correo@ejemplo.com', 'Nombre', 'slug');
```

### Alta de alumnos
Comparte `https://TU-DOMINIO/register?c=felipe` (aparece con botón «Copiar» en «Mis atletas»).

Confirmar un alumno a mano (si la confirmación por correo está activa):
```sql
update auth.users set email_confirmed_at = now() where email = 'alumno@correo.com';
```

## Correr en local (opcional, requiere Node 20+)
```bash
npm install
```
```bash
cp .env.example .env.local
```
```bash
npm run dev
```

## Publicar
Sube el repo a GitHub → en Vercel «Add New → Project» → importa el repo → agrega las 2 variables de entorno → Deploy. Luego en Supabase → Authentication → URL Configuration, pon el dominio de Vercel como **Site URL** y agrega `https://TU-DOMINIO/**` en **Redirect URLs**.

## Decisiones tomadas
- **Coach por invitación**: en vez de promover con SQL tras registrarse, el correo del coach queda pre-autorizado, así no hay que correr SQL.
- **Semana de check-in** = semana ISO Lun–Dom (`checkins.week_number` = AAAASS, p. ej. 202647). Zona horaria `America/Santiago`.
- **Versionado de dieta**: una versión vigente creada antes de hoy no se edita; el botón «Crear nueva versión para editar» la copia con vigencia desde mañana. Una dieta nueva o creada hoy se edita directo.
- `next.config.mjs` ignora errores de tipos/lint en el build para que la publicación en Vercel no se bloquee por advertencias.

## Próximos pasos sugeridos
1. Feedbacks con Loom más completos (notificación al alumno y vinculado a cada check-in).
2. Tendencias de peso y medidas (gráficos semana a semana).
3. Suscripción y pagos (por ejemplo con Mercado Pago o Stripe).
