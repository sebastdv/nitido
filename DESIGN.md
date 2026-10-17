# nitido — diseño

Herramienta de JSON para desarrolladores: formatear, validar y comparar. Todo corre en el
navegador; ningún dato sale del computador de quien la usa.

## Qué hace

- **Formatear:** sangría de 2, 4 espacios o tabulador; minificar; ordenar claves.
- **Validar:** si el JSON tiene un error, dice qué pasó en español, en qué línea y columna, y cómo
  arreglarlo cuando el error es común (coma final, comillas simples, claves sin comillas,
  comentarios). Avisa de claves duplicadas, que `JSON.parse` acepta en silencio.
- **Comparar:** dos JSON lado a lado con las líneas cambiadas resaltadas, más la lista de
  cambios por ruta (`$.usuario.direccion.ciudad`: añadido, eliminado o modificado). Las claves se
  comparan sin importar el orden.

## Decisiones

| Tema | Decisión | Por qué |
|---|---|---|
| Arquitectura | App estática (Vite + React + TypeScript) | Sin servidor, el JSON nunca se envía a ningún lado; se publica gratis en cualquier hosting estático. |
| Parser | Propio, en TypeScript | `JSON.parse` da mensajes distintos en cada navegador, sin línea ni columna fiables, y redondea números grandes (`12345678901234567890` se vuelve `12345678901234567000`). El parser propio conserva el texto exacto de cada número. |
| Comparación | Estructural por rutas + diferencia de líneas (LCS) sobre la versión formateada con claves ordenadas | La lista por rutas responde "qué cambió"; la vista de líneas responde "dónde". Ordenar claves evita falsos cambios por orden. |
| Persistencia | `localStorage`, solo en el navegador | Al recargar no se pierde lo que estabas editando. |
| Límites | La vista de líneas se desactiva por encima de 3.000 líneas por lado | El LCS es O(n·m); la lista por rutas sigue funcionando. |

## Fuera de alcance

Enviar o compartir JSON por servidor, JSON Schema, JSONPath, edición en árbol.
