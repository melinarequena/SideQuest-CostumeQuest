# Side Quest - Costume Quest

Concurso de disfraces para **SideQuest - Halloween Party**. Web responsive en español rioplatense, sin formularios de registro ni correo para los invitados.

## Stack

- Next.js App Router, React y TypeScript.
- Tailwind CSS 4, estilos propios y Lucide.
- Motion para tarjetas y gestos de swipe, respetando movimiento reducido.
- Supabase Auth anónimo, PostgreSQL con RLS y Storage.
- Preparada para Vercel, sin credenciales de administrador en el navegador.

## Arrancar

Requiere Node.js 22.13 o superior.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Abrir `http://127.0.0.1:3000`. Si el puerto está ocupado, Next informa otro puerto.

La configuración inicial permite una **demo explícita** (`NEXT_PUBLIC_DEMO_MODE=true`). La demo usa tres ilustraciones de ejemplo y guarda la participación en este navegador. No comparte fotos ni votos entre dispositivos. Para reiniciarla, borrar `costume-quest-demo-v1` del almacenamiento local del sitio.

## Conectar Supabase

1. Crear un proyecto de Supabase.
2. En **Authentication → Sign In / Providers**, habilitar **Anonymous Sign-Ins**.
3. Ejecutar las migraciones de `supabase/migrations/` en orden, una sola vez cada una. La tercera, `202610280001_owner_portal.sql`, agrega el portal privado y deja la votación cerrada por defecto. En un proyecto existente aplicar únicamente las migraciones pendientes.
4. Copiar la URL del proyecto y su **publishable key** (o la antigua clave pública `anon`) a `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICA
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SITE_URL=https://TU-DOMINIO
```

5. Reiniciar el servidor. Las variables `NEXT_PUBLIC_*` se incorporan en el build; volver a compilar si cambian en producción.

No usar una clave `service_role` ni una clave secreta como publishable key. La aplicación no las necesita, tampoco para el portal. Los errores de conexión reales se muestran como errores; no se convierten en votos de demo.

## Publicar y obtener el QR

1. Subir este proyecto a un repositorio y conectarlo con Vercel (preset Next.js).
2. Configurar las cuatro variables anteriores en Vercel, con demo en `false`.
3. Publicar y comprobar carga de foto y voto desde dos navegadores distintos.
4. Abrir **Compartir quest** y descargar el QR PNG. Usa `NEXT_PUBLIC_SITE_URL` o, si está vacía, el origen actual. El diálogo advierte cuando el QR apunta a localhost y todavía no sirve para otros dispositivos.

## Reglas implementadas

- Una participación por sesión anónima. Se restaura al volver desde el mismo navegador.
- Inicio con logo grande y botón «Subir foto». Carga de foto y nombre (de 2 a 40 caracteres) en una pantalla aparte; al enviar, se abre la votación con tarjetas deslizables.
- JPG, PNG o WebP de hasta 15 MB; se valida y comprime localmente a JPEG, hasta 1600 × 2000 px y 3 MB. La conversión elimina metadatos del archivo original. HEIC no está admitido.
- «Ir a votar» pregunta si ya subiste una foto. «Sí» abre la votación sin comprobar que exista una participación; «No» abre la carga. La sesión anónima se crea automáticamente, sin registro ni correo, y permite guardar votos aunque no hayas subido foto.
- Tocar una de las 5 estrellas guarda esa puntuación y pasa al siguiente disfraz automáticamente. Durante el guardado y la transición se bloquean nuevos toques; si falla, la tarjeta queda visible para reintentar.
- No se permite votar el propio disfraz. La base de datos impide votos duplicados, incluso por peticiones simultáneas. Un reintento del mismo voto es idempotente.
- Omitir con botón o arrastrando hacia cualquiera de los dos lados. Omitir no guarda un voto y permite volver a ver ese disfraz.
- Salir de la votación conserva los votos guardados.
- **Volver a votar** consulta disfraces nuevos y pendientes; no vuelve a mostrar los ya votados.
- Si nadie subió fotos, se muestra «Nadie subio una foto aun, que esperas para ser el primero?» y el mismo botón «Subir foto», que abre la carga. Si existen fotos pero no quedan pendientes para esa sesión, se mantiene «Estás al día».
- Cada ronda consulta hasta 200 disfraces, con orden mezclado y estable por sesión. Otra ronda permite continuar si hay más.

## Resultados para organización

Abrir `/nacho`. El formulario solo pide contraseña y el portal no tiene un enlace desde la app pública. La autorización se comprueba en el servidor y en cada función de base de datos; conocer la dirección no da acceso.

Configuración única:

1. En Supabase → Authentication → Users → Add user → Create new user, crear la cuenta de Nacho con correo y contraseña y confirmar el correo desde la creación administrativa. No se envía una invitación desde la app.
2. Configurar `QUEST_ADMIN_EMAIL` en el servidor/Vercel, sin prefijo `NEXT_PUBLIC_`. El correo no se solicita en el formulario ni se incorpora al JavaScript del navegador.
3. Desde SQL Editor, otorgar el permiso a esa cuenta (sustituir el correo):

```sql
insert into public.quest_admins(user_id)
select id from auth.users where lower(email) = lower('CORREO_DE_NACHO') and not is_anonymous
on conflict do nothing;
```

La contraseña se guarda en Supabase Auth, no en el código ni en variables públicas. La sesión administrativa usa cookies HttpOnly y Secure en producción, separadas de la sesión anónima de los invitados; el portal permite cerrar sesión. Los endpoints de escritura verifican el origen. Supabase aplica sus límites de intentos de acceso.

Nacho puede habilitar o cerrar la votación sin borrar votos. Las inscripciones siguen abiertas. La base de datos bloquea votos cerrados incluso desde tarjetas antiguas o peticiones directas. Los invitados actualizan el estado cada 10 segundos y al volver a la pestaña; un intento de votar después del cierre se rechaza inmediatamente en la base.

El podio ordena por **total de estrellas acumuladas**, con un máximo de tres ganadores y una persona por puesto. Los empates ocupan puestos consecutivos, con orden fijo por ID; no cambian los puntajes. Los participantes sin votos no aparecen como ganadores. La migración `202610290001_unique_podium_places.sql` aplica esta regla en Supabase; la API también normaliza bases que todavía usan puestos compartidos. Los resultados son provisorios mientras la votación está abierta. En `/nacho/podio` se muestran los totales de disfraces, votos y estrellas, con actualización cada 15 segundos. No se publican resultados ni votos individuales en la app de invitados.

**Ver resultados** toma los puntajes de ese momento y abre `/nacho/podio/resultados`. La presentación es visual, sin sonido: revela el tercer puesto después de una breve pausa de suspenso y espera un clic para pasar al segundo, y otro para el primero, con confeti rojo y blanco. Cada ganador queda visible el tiempo que necesite la organización. Al final se puede abrir el podio completo, repetir la misma presentación o volver al portal. Si faltan puestos se omiten; cada puesto revela un único ganador.

La presentación conserva los resultados capturados en memoria de esa pestaña, sin guardarlos en la URL ni en almacenamiento persistente. Un voto nuevo no cambia un ganador a mitad de la ceremonia. El acceso administrativo se vuelve a verificar al entrar y se borra la captura al cerrar sesión. Con movimiento reducido se muestra directamente el podio estático, sin pulsos ni confeti.

También se puede ejecutar `supabase/results.sql` desde SQL Editor; ordena por total de estrellas.

## Límites y operación

- Sin identificar a las personas, no es posible impedir que alguien use otro navegador o borre su sesión para volver a participar. El control es por sesión anónima, no por persona física.
- Las fotos se guardan en un bucket público para mostrarlas en las tarjetas. Quien conozca una URL de foto puede abrirla. Los votos individuales solo pueden ser leídos por su emisor y por la administración de Supabase.
- Hay validación de formato, tamaño, permisos y puntuaciones. No hay moderación automática de contenido ni mecanismo de eliminación desde la interfaz. La organización puede retirar participaciones en Supabase. Tras la fiesta, eliminar archivos y usuarios anónimos según la retención que defina la organización; borrar una fila no borra automáticamente su archivo de Storage.
- Configurar los límites de solicitudes de Supabase Auth según la asistencia. Activar CAPTCHA requiere integrar su desafío en la app; no habilitarlo sin esa integración.
- El código no provisiona cuentas de Supabase/Vercel. Hace falta configurar el proyecto real y la cuenta administrativa para uso compartido. La demo local conserva la votación abierta y no concede acceso al portal.

## Verificación

```powershell
npm run typecheck
npm test
npm run build
```

Los tests cubren validación, filtrado de pendientes y las reglas de seguridad de la migración en PostgreSQL embebido. Las pruebas del backend alojado requieren las credenciales de un proyecto Supabase.

Los assets de marca y ambientación provienen de las imágenes proporcionadas. La nueva foto de Halloween aparece en el inicio, junto al logo en escritorio y encima en móvil. `public/demo/*.svg` contiene ilustraciones locales marcadas como demo, no participantes reales.
