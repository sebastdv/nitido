# nitido

Formatea, valida y compara JSON en tu navegador. Nada se envía a ningún servidor.

- **Formatear:** sangría de 2 o 4 espacios o tabulador, minificar y ordenar claves. Copia o
  descarga el resultado, abre archivos o arrástralos al editor.
- **Validar:** cuando algo falla, dice qué pasó, en qué línea y columna, y marca el lugar exacto
  como lo haría un compilador. Reconoce los errores típicos (coma al final, comillas simples,
  claves sin comillas, comentarios, `True` o `undefined`) y explica cómo arreglarlos. Avisa de
  claves duplicadas, que `JSON.parse` acepta en silencio.
- **Comparar:** dos JSON con la lista de cambios por ruta (`$.cliente.ciudad`: modificado,
  añadido o eliminado) y la vista línea a línea. El orden de las claves no cuenta como cambio.

## Por qué un parser propio

`JSON.parse` tiene tres problemas para una herramienta así:

1. Sus mensajes cambian según el navegador y no siempre dicen línea y columna.
2. Acepta claves duplicadas sin avisar.
3. Redondea los números grandes: `12345678901234567890` se convierte en `12345678901234567000`.
   Si formateas un JSON con IDs de 19 dígitos, te devuelve otros IDs.

`src/lib/parse.ts` es un parser descendente recursivo que conserva el texto exacto de cada número,
lleva la posición de cada error y explica los errores comunes en español. La comparación de
números es exacta (normaliza `1.0`, `1e0` y `1` sin pasar por coma flotante).

## Stack

React 19, TypeScript, Vite, Tailwind CSS 4 y Vitest. Sin backend: se publica como sitio estático.
Las fuentes (Onest y Fragment Mono) van incluidas, así que la página no hace peticiones a terceros.

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 34 tests del parser, el formateo, la comparación y el coloreado
npm run build      # genera dist/
```

## Publicar

Es un sitio estático: en Vercel o Netlify basta con importar el repositorio (build `npm run build`,
carpeta `dist`).

Las decisiones de diseño están en [DESIGN.md](DESIGN.md).
