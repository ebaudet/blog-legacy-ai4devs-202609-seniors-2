# Prompts

Aquí van **todos los prompts que lanzaste** para hacer el ejercicio, en el orden en que los
lanzaste, con el modelo y la herramienta de cada uno.

Esto no es papeleo. Lo que se revisa es **cómo pediste las cosas**, no solo lo que salió: un
resultado flojo con un prompt bueno y un resultado flojo con un prompt vago necesitan feedback
distinto, y sin este archivo no se distinguen.

## Cómo rellenarlo

- Un apartado `## Prompt N` por cada prompt.
- **Pega el prompt tal cual lo lanzaste**, dentro del bloque de código, aunque ocupe diez líneas
  y aunque tenga faltas. No lo reescribas para que quede bien: el que arreglaste mentalmente
  después no es el que lanzaste.
- Incluye también los que **no funcionaron**. Suelen ser los más útiles de leer.
- `Modelo` y `Herramienta` en todos. Si cambiaste de una a otra a mitad, se nota aquí.

## Resumen

Herramienta en los 8 prompts: **Claude Code 2.1.308** (CLI). Modelo en todos: **Sonnet 5.5**
(`claude-sonnet-5-5`), con **Opus 5.5** (`claude-opus-5-5`) como modelo asesor en cada llamada.
Esfuerzo registrado en todas las llamadas: **high**.

| # | Sesión | Hora de inicio (UTC) | Duración | Llamadas al modelo | Resultado |
|---|---|---|---|---|---|
| 1 | 1.ª (e811f2c4) | 12:51:33 | 3 min 24 s (interrumpido) | 28 | Interrumpido, sin entregable |
| 2 | 2.ª (d364b779) | 12:57:36 | 8 min 36 s | 35 | Auditoría escrita |
| 3 | 2.ª | 13:19:31 | 11 s | 2 | Explicación |
| 4 | 2.ª | 13:22:15 | 1 min 5 s | 17 | Documento corregido |
| 5 | 2.ª | 13:25:36 | 8 s | 1 | Explicación |
| 6 | 2.ª | 13:28:59 | 4 min 52 s | 12 | Leyenda y auditoría del documento |
| 7 | 2.ª | 13:44:20 | ≈ 1 min 25 s (hasta el prompt 8) | no contadas | Este archivo (primera parte) |
| 8 | 2.ª | 13:45:45 | en curso al escribir esto | — | Este archivo (versión final) |

**Tiempo total medido: ≈ 19 min 40 s** (prompts 1–7, de la solicitud al último evento de cada
turno; excluye las esperas entre prompts, p. ej. 13:06 → 13:19 y 13:33 → 13:44).

### Cómo se midió (y qué no es)

- **Fuente**: las marcas de tiempo de los registros de sesión de Claude Code
  (`~/.claude/projects/-Users-ebaudet-rendu-tutorials-lidr-m06/*.jsonl`); el modelo, el asesor y el
  esfuerzo salen de los campos `model`, `advisorModel` y `effort` de esos mismos registros.
- **Duración** = desde que se envía el prompt hasta el último evento de su turno. Incluye lo que
  tarda el modelo y lo que tardan las herramientas (tests, `curl`, lecturas). No es tiempo de
  pensamiento; ese fue mucho menor (p. ej. 208 s de razonamiento dentro de los 8 min 36 s del
  prompt 2).
- **Esfuerzo** = el nivel configurado (`high`), no un coste medido. No he calculado tokens ni coste
  en dinero.
- El **prompt 1** corre en otra sesión, que se interrumpió a los 3 min 24 s: la última llamada
  del modelo fue a los 1 min 38 s, el resto fue una herramienta que seguía en curso.
- El **prompt 7** no tiene una duración propia limpia: el prompt 8 llegó mientras seguía en curso.
- Tu tiempo de lectura y de escritura entre prompts **no está** incluido.

---

## Prompt 1

**Modelo:** Sonnet 5.5 (asesor: Opus 5.5) · esfuerzo high
**Herramienta:** Claude Code
**Duración:** 3 min 24 s, interrumpido

```
Quiero que hagas 1 audit priorizado de características para ver los puntos problemáticos. En este informe, quiero que me des una tabla priorizada, una línea por hallazgo con 6 columnas:
1. Qué es (una frase)
2. Dónde está, con la línea que lo demuestra
3. Qué lo rompe y quién lo nota ("nadie por ahora" es válido)
4. Número de lugares a tocar (contados, no estimados)
5. ¿1 revert lo anula ? Sí/no, y por qué
6. ¿Bloquea o desbloquea otro hallazgo ? ¿Cuál ("ninguno" es frecuente)

Regla de orden:
1. Primero la precedencia (lo que desbloquea o hace más barato otro hallazgo pasa primero).
2. Luego, en cada nivel, daño ÷ radio.
3. 1 hallazgo con el máximo de daño pero baja precedencia se divide en dos líneas: contención inmediata + corrección de fondo.
4. Las propuestas no medibles van fuera de la tabla, con lo que habría que medir.

output: docs/auditoria/comentarios.md
```

**Qué salió:** se interrumpió sin entregable. El prompt no acotaba la feature («características»
en general) y el siguiente sí (comentarios: rutas, tabla, web). El registro no dice por qué se
interrumpió.

---

## Prompt 2

**Modelo:** Sonnet 5.5 (asesor: Opus 5.5) · esfuerzo high
**Herramienta:** Claude Code
**Duración:** 8 min 36 s (35 llamadas)

```
Quiero que hagas 1 auditoría. Auditoría únicamente la función comentarios (rutas API, tabla en base, visualización web).

Salida en 1 archivo `docs/auditoria/comentarios.md`

En este informe, quiero que me des 1 tabla priorizada, 1 línea por hallazgo con 6 columnas:
1. Qué es (una frase)
2. Dónde está, con la línea que lo demuestra
3. Qué rompe y quién lo nota ("nadie por ahora" es válido)
4. Número de lugares a tocar (contados, no estimados)
5. ¿1 revert lo anula ? Sí/no, y por qué
6. ¿Bloquea o desbloquea otro hallazgo ? El cuál ("ninguno" es frecuente)

Regla de orden:
1. Primero la precedencia (lo que desbloquea o hace más barato otro hallazgo pasa primero).
2. Luego, en cada nivel, daño ÷ radio.
3. 1 hallazgo con el máximo daño pero precedencia baja se divide en dos líneas: contención inmediata + corrección de fondo.
4. Las propuestas no medidas van fuera de la tabla, con lo que habría que medir.
```

(Texto pegado en el terminal; así llegó al agente.)

**Qué salió:** funcionó a la primera en cuanto al formato (14 hallazgos en tabla de 6 columnas y
propuestas sin medir fuera). Fallos: usé `:152` sin nombre de archivo, etiquetas H1/A1/F2 sin
explicar, y una cifra incoherente (N) y alguna afirmación sin evidencia.

---

## Prompt 3

**Modelo:** Sonnet 5.5 (asesor: Opus 5.5) · esfuerzo high
**Herramienta:** Claude Code
**Duración:** 11 s (2 llamadas)

```
No entiendo lo que has puesto.

- Nivel 0 -> 4 : ¿cuál tiene más prioridad?

- que significa esto : 
```
`:152` `select * from comentarios where post_id = ? and estado = 'aprobado' …`. **Verificado en vivo** (`GET /posts/diez-tendencias-…`): el comentario 2 trae `autor_email: "marta.ruiz@corriente.es"`; claves devueltas: `autor_email, autor_nombre, creado_en, cuerpo, estado, id, padre_id, post_id`.
```
```

**Qué salió:** funcionó. Respondió en el chat y ofreció simplificar; no tocó el documento.

---

## Prompt 4

**Modelo:** Sonnet 5.5 (asesor: Opus 5.5) · esfuerzo high
**Herramienta:** Claude Code
**Duración:** 1 min 5 s (17 llamadas)

```
Y porque no poner el nombre del fichero ? Como tenia que saberlo ??
```

**Qué salió:** tenía razón: el encabezado decía «líneas de `routes.ts`» pero lejos de la tabla.
Añadió el nombre del archivo a cada `archivo:línea` y una leyenda de rutas completas.

---

## Prompt 5

**Modelo:** Sonnet 5.5 (asesor: Opus 5.5) · esfuerzo high
**Herramienta:** Claude Code
**Duración:** 8 s (1 llamada)

```
Que significal H1, A1, F2, etc ?
```

**Qué salió:** funcionó. Explicó que son etiquetas inventadas por el agente, sin convención, y
que debió explicarlas en el documento.

---

## Prompt 6

**Modelo:** Sonnet 5.5 (asesor: Opus 5.5) · esfuerzo high
**Herramienta:** Claude Code
**Duración:** 4 min 52 s (12 llamadas)

```
Vale, es interessante, pero entonces anotalo en el documento.

Y hace un audit de tu proprio documento, par aclarar lo implicito
```

**Qué salió:** funcionó. Añadió la leyenda y la sección de auditoría del propio informe. Encontró
5 errores propios: radio de N mal puntuado (1,5 en vez de 1,0), «nadie lo ha notado» sin
evidencia, patrón de correos sin comprobar, «8 recursos» falso y bloqueos de A2 exagerados.

---

## Prompt 7

**Modelo:** Sonnet 5.5 (asesor: Opus 5.5) · esfuerzo high
**Herramienta:** Claude Code
**Duración:** ≈ 1 min 25 s, hasta el prompt 8

```
Copiar todos los prompts, los modelos, el tiempo y el esfuerzo utilizado en el archivo prompts.md en la raíz del proyecto.
```

**Qué salió:** a medias. Encontró las marcas de tiempo en los registros de sesión y descubrió el
primer intento interrumpido (prompt 1), pero todavía no había escrito el archivo.

---

## Prompt 8

**Modelo:** Sonnet 5.5 (asesor: Opus 5.5) · esfuerzo high
**Herramienta:** Claude Code
**Duración:** en curso al escribir esto

```
continue
```

**Qué salió:** este archivo.
