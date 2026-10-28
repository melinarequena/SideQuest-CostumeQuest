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
3. Ejecutar las migraciones de `supabase/migrations/` en orden, una sola vez cada una: primero `202610270001_costume_quest.sql` y después `202610270002_allow_voting_without_photo.sql`. También se pueden aplicar con Supabase CLI. Si ya aplicaste la primera, ejecutar solamente la segunda. Crean las tablas, funciones, políticas, el bucket y permiten votar sin foto.
4. Copiar la URL del proyecto y su **publishable key** (o la antigua clave pública `anon`) a `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICA
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SITE_URL=https://TU-DOMINIO
```

5. Reiniciar el servidor. Las variables `NEXT_PUBLIC_*` se incorporan en el build; volver a compilar si cambian en producción.

No usar una clave `service_role` ni una clave secreta como publishable key. La aplicación no las necesita. Los errores de conexión reales se muestran como errores; no se convierten en votos de demo.

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

Ejecutar `supabase/results.sql` desde el SQL Editor. Muestra promedio, cantidad de votos y total de estrellas. La interfaz pública no muestra un ranking que pueda influir en el voto. La consulta ordena por promedio y después cantidad de votos; la organización debe definir el criterio de premiación y cualquier mínimo de votos.

## Límites y operación

- Sin identificar a las personas, no es posible impedir que alguien use otro navegador o borre su sesión para volver a participar. El control es por sesión anónima, no por persona física.
- Las fotos se guardan en un bucket público para mostrarlas en las tarjetas. Quien conozca una URL de foto puede abrirla. Los votos individuales solo pueden ser leídos por su emisor y por la administración de Supabase.
- Hay validación de formato, tamaño, permisos y puntuaciones. No hay moderación automática de contenido ni mecanismo de eliminación desde la interfaz. La organización puede retirar participaciones en Supabase. Tras la fiesta, eliminar archivos y usuarios anónimos según la retención que defina la organización; borrar una fila no borra automáticamente su archivo de Storage.
- Configurar los límites de solicitudes de Supabase Auth según la asistencia. Activar CAPTCHA requiere integrar su desafío en la app; no habilitarlo sin esa integración.
- No hay cuenta de Supabase/Vercel provisionada ni despliegue realizado por el código. Hace falta configurar el proyecto real para uso compartido.

## Verificación

```powershell
npm run typecheck
npm test
npm run build
```

Los tests cubren validación, filtrado de pendientes y las reglas de seguridad de la migración en PostgreSQL embebido. Las pruebas del backend alojado requieren las credenciales de un proyecto Supabase.

Los assets de marca y ambientación provienen de las imágenes proporcionadas. La nueva foto de Halloween aparece en el inicio, junto al logo en escritorio y encima en móvil. `public/demo/*.svg` contiene ilustraciones locales marcadas como demo, no participantes reales.
