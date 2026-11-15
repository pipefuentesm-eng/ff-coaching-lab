# Guía paso a paso · Publicar FF Coaching Lab (sin programar, desde Safari)

La base de datos ya está lista en Supabase. Solo falta subir el código a GitHub y publicarlo con Vercel.

## 1. Descomprimir
Safari descomprime el .zip solo. En **Descargas** tendrás la carpeta `ff-coaching-lab`.

## 2. Subir el código a GitHub
1. Entra a https://github.com/new
2. En *Repository name* escribe `ff-coaching-lab`, elige **Private** y pulsa **Create repository**. No marques «Add a README».
3. En la página del repositorio vacío, haz clic en el link **«uploading an existing file»**.
4. Abre la carpeta `ff-coaching-lab` en Finder, selecciona **todo su contenido** con ⌘A (las carpetas `app`, `components`, `lib`, `public`, `supabase` y los archivos sueltos) y arrástralo a la página de GitHub.
   - Arrastra **el contenido**, no la carpeta completa.
5. Espera a que terminen de cargar y pulsa **Commit changes**.
6. Revisa: en la página del repositorio deben verse directamente `app`, `lib`, `package.json`, etc. Si en cambio ves una sola carpeta `ff-coaching-lab`, no pasa nada: en el paso 3.4 pon `ff-coaching-lab` en «Root Directory».

## 3. Publicar en Vercel
1. Entra a https://vercel.com/new
2. En «Import Git Repository», busca `ff-coaching-lab` y pulsa **Import**.
   - Si no aparece, pulsa «Adjust GitHub App Permissions» y dale acceso a ese repositorio.
3. *Framework Preset* debe decir **Next.js** (lo detecta solo).
4. Abre **Environment Variables** y agrega estas dos (nombre → valor):
   - `NEXT_PUBLIC_SUPABASE_URL` → `https://obcemvxrzgantdanmtbo.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` → `sb_publishable_tId3OHbQhI_UVtVtFqBaBA_0rQzfpEi`
5. Pulsa **Deploy** y espera unos 2 minutos.
6. Cuando salga «Congratulations», copia el link de tu app (algo como `https://ff-coaching-lab.vercel.app`).
   - Si sale un error en rojo, copia esas líneas y pégamelas en el chat.

## 4. Conectar el link con Supabase
1. Abre https://supabase.com/dashboard/project/obcemvxrzgantdanmtbo/auth/url-configuration
2. En **Site URL** pega el link de tu app y guarda.
3. En **Redirect URLs** pulsa «Add URL», pega tu link agregándole `/**` al final (ej. `https://ff-coaching-lab.vercel.app/**`) y guarda.
4. **Recomendado:** abre https://supabase.com/dashboard/project/obcemvxrzgantdanmtbo/auth/providers, entra a **Email**, desactiva **Confirm email** y guarda.
   - El correo gratuito de Supabase solo envía unos pocos mensajes por hora. Sin esta opción, los alumnos entran directo al registrarse.

## 5. Crear tu cuenta de coach
1. Abre tu link y pulsa **Registro**.
2. Regístrate con **pipefuentes.m@gmail.com**. Ese correo entra automáticamente como coach, con alimentos, ejercicios y preguntas de check-in ya cargados.

## 6. Probar con un alumno
1. En «Mis atletas», copia el **link de alta** (`…/register?c=felipe`).
2. Ábrelo en una ventana privada de Safari (o en tu celular) y registra un alumno de prueba con otro correo.
3. Vuelve a tu ficha de coach, entra al alumno, crea un bloque y agrega un día y ejercicios.
4. Pulsa **Ver como atleta** para ver exactamente lo que ve el alumno.

## 7. En el celular
En Safari abre el link → botón Compartir → **Agregar a pantalla de inicio**. Queda como una app.

## Cambios futuros
Cuando te pase archivos nuevos: en GitHub, «Add file → Upload files», arrástralos (respetando la carpeta) y pulsa «Commit changes». Vercel vuelve a publicar solo, en unos 2 minutos.
