# Zitra: recurso de la transición de carga

- Recurso usado por la app: `public/brand/zitra-upload-transition.png`.
- Componente: `src/components/upload-transition.tsx`.
- Generado con la herramienta integrada `imagegen`, modo de edición con fondo transparente. No se usó la API ni CLI.
- Referencia: la imagen de Zitra con el cuchillo aportada por el usuario el 27 de octubre de 2026.
- PNG de 1142 × 1377, con transparencia real verificada. Para cambiar la pose, reemplazar este PNG manteniendo el nombre; no hace falta modificar el flujo de carga.

## Prompt usado

Use case: background-extraction. Asset type: transparent PNG cutout for a website transition. Edit target: supplied image. Isolate ONLY Zitra, the purple/magenta low-poly rabbit-eared humanoid holding the raised knife and dangling Ghostface costume mask, as seen in this image. Preserve the exact character identity, action pose, round purple helmet, hot pink square eyes, pink pixel ears, turquoise armor and purple limbs, low-poly angular geometry, current knife and mask costume prop. Remove all background corridor, floor, reflections, and the entire black-clad Ghostface person lying in foreground. Fill in only the small parts of Zitra's lower legs obscured by the foreground person, naturally matching the existing low-poly character. Center Zitra on a true transparent alpha background with a little transparent padding around the ears, knife and costume mask, no cropped extremities. No additional characters, no scene, no floor shadow, no text, no border, no watermark. Keep source colors and lighting. Actual transparent pixels, no painted checkerboard.

## Comportamiento

La transición comienza solo después de validar la foto y el nombre al pulsar “Subir foto y votar”. La carga real comienza de inmediato. La aproximación dura 0,8 segundos; si la carga tarda más, el personaje flota hasta que esté lista. La votación se prepara detrás y se revela al terminar. Un error de carga conserva el formulario y permite reintentar. Si la foto ya quedó guardada pero falla la lista de disfraces, se ofrece “Seguir votando”. La preferencia de movimiento reducido evita el zoom y la rotación. Si el recurso de Zitra no carga, un indicador de carga permite completar el flujo.

## Verificación

- Compilación de producción y TypeScript correctos.
- 11 pruebas existentes de validación y base de datos correctas.
- Envíos nuevos probados por interfaz en celular (390 × 844) y escritorio (1280 × 800).
- Formulario sin foto: muestra error y no inicia la transición.
- Tras el envío: la transición desaparece, habilita los controles y devuelve el foco al contenido de votación.
- En celular, la altura de la página coincide con la pantalla después del envío.
