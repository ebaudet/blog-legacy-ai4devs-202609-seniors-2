# Auditoría de la feature «comentarios»

Alcance: las tres capas de la feature y nada más — rutas de la API (`backend/start/routes.ts`),
tabla `comentarios` (migración `1769000000005`, semilla) y lo que la web enseña
(`frontend/src/componentes/Comentarios.jsx`, `DetallePost.jsx` y los recuentos de `ListaPosts.jsx` / `PostsRelacionados.jsx`). Fecha: 2026-10-22. Auditoría de solo lectura: no se ha modificado código ni datos (las únicas peticiones HTTP escritas fueron cuatro `POST` inválidos que no insertan).
Base: rama `s6/start`, commit `ad34f0e`; los números de línea se refieren a ese commit.
Fuera de alcance: los otros cuatro recursos (posts, autores, categorías, etiquetas); al leer
`routes.ts` vi cosas en ellos y no se listan, por indicación. Tampoco incluye la «Parte B» del
`README.md` (cuántos hallazgos devolvió el agente y cuántos comprobaste tú): depende de quien
revisa.

## Cómo leer la tabla

- **Orden**: primero la precedencia (nivel 0 → 4: lo que desbloquea o abarata a otro va antes);
  dentro de cada nivel, daño ÷ radio (puntuación al final del documento).
- **«¿1 revert lo anula?»** se refiere a **la corrección** propuesta: si deshacerla con un único
  `git revert` devuelve el sistema al estado previo. Cuando el daño ya causado no se recupera, lo digo.
- **Líneas**: toda referencia `archivo:línea` lleva su archivo. Rutas completas:
  `routes.ts` = `backend/start/routes.ts` · `create_comentarios_table.ts` =
  `backend/database/migrations/1769000000005_create_comentarios_table.ts` · `blog_seeder.ts` =
  `backend/database/seeders/blog_seeder.ts` · `Comentarios.jsx`, `DetallePost.jsx`, `ListaPosts.jsx`,
  `PostsRelacionados.jsx` = `frontend/src/componentes/…` · `comentarios.spec.ts` =
  `backend/tests/functional/comentarios.spec.ts`.
- **Dato local**: `backend/tmp/db.sqlite3` no está versionado (`backend/.gitignore:4`) y **no es la semilla**: tiene 40 comentarios (la semilla, 9), 30 son pruebas manuales de `s@s.es`, y faltan los ids 1 y 3. Todo lo medido en ella va marcado «BD local».
- «Bloqueado por H1» aparece en casi todas las filas porque `CLAUDE.md` exige tests de
  caracterización antes de tocar comportamiento existente, y arreglar un bug es otra tarea con su propia decisión.
- **«Sitios a tocar»** cuenta lo mínimo de código de producción o de esquema que cambia; **no**
  cuenta los tests que cada corrección necesita (eso es H1) ni los entornos desplegados.
- **Verificado / deducido**: «verificado en vivo» = lo comprobé contra la API o la BD local;
  «deducido del código» = lo concluyo leyendo, no lo ejecuté. Al final hay un resumen.

## Leyenda: etiquetas, niveles y vocabulario

**Etiquetas (H1, A1, F2…).** Códigos que puse yo para poder decir «bloqueado por H1» sin repetir la frase. No son una convención ni indican gravedad: las letras son una mnemotecnia y los números `1`/`2` marcan las dos mitades de un mismo hallazgo.

| Etiqueta | Mnemotecnia               | Hallazgo                                                         |
| -------- | ------------------------- | ---------------------------------------------------------------- |
| H1       | **H**abilitador           | Faltan tests de comentarios                                      |
| A1 / A2  | **A**utor_email           | Correo en la respuesta pública: contención / corrección de fondo |
| F2       | **F**ilas sucias          | `estado` con valores `Aprobado` y `ok`                           |
| M        | **M**uerte de un padre    | Borrar un comentario deja huérfanas a sus respuestas             |
| F1       | **F**órmula de recuento   | Dos reglas para contar comentarios visibles                      |
| C1 / C2  | **C**lave                 | Clave de moderación en el código: contención / autorización real |
| E        | **E**xistencia del padre  | `padre_id` sin validar                                           |
| N        | **N**o coincide           | `PATCH` aplica otra regla de autor que `DELETE`                  |
| D        | **D**evoluciones de error | El `POST` responde los errores de 4 formas                       |
| G        | **G**ráfico (la web)      | Tres números distintos para el recuento en la web                |
| K        | **K**eys                  | Tabla sin clave foránea, índice ni CHECK                         |
| H        | **H**ttp                  | El post se pide dos veces por visita                             |

(`H1` y `H` no tienen relación: es un choque de letras.) Las etiquetas A, F, C, etc. no siguen el
orden de la tabla; el orden lo da el nivel.

**Niveles (0 → 4).** El nivel 0 se hace primero y el 4 el último. No miden gravedad, miden
precedencia:

| Nivel | Significa | Hallazgos |
|---|---|---|
| 0 | Habilita todo lo demás | H1 |
| 1 | Desbloquea a otros hallazgos | A1, F2 |
| 2 | Se puede arreglar ya, sin esperar a nadie | M, F1, C1, E, N, D, G |
| 3 | Depende de hallazgos del nivel 2 | K, H |
| 4 | Corrección de fondo, la más grande | A2, C2 |

**Vocabulario.**

- **Contención inmediata**: el cambio más pequeño que corta el daño (A1, C1). **Corrección de
  fondo**: la solución definitiva, más grande y con más dependencias (A2, C2).
- **Tests de caracterización**: tests que fijan lo que el sistema hace hoy, bugs incluidos, antes de
  tocarlo (`CLAUDE.md`).
- **Reglas 5 y 6 del dominio**: las de `CLAUDE.md` y `README.md`: «el recuento cuenta solo los
  aprobados» (5) y «la respuesta pública no expone el correo del autor ni el de quien comenta» (6).
- **La semilla**: `backend/database/seeders/blog_seeder.ts`, los 9 comentarios con los que arranca
  el proyecto. **BD local**: `backend/tmp/db.sqlite3`, la base de esta máquina (ver arriba).
- **Huérfana**: respuesta cuyo `padre_id` apunta a un comentario que ya no existe.
- **FK / CHECK**: clave foránea (la base impide apuntar a una fila inexistente) / restricción que
  limita los valores de una columna (p. ej. `estado` solo `pendiente` o `aprobado`).
- **Transformer**: la capa que decide qué campos salen en la respuesta (`CLAUDE.md`).
- **Radio**: el número de la columna «Sitios a tocar». **Daño**: escala 1–10, juicio mío.
- **«Nadie por ahora»**: no hay evidencia de que hoy afecte a nadie; no garantiza que no pase.
- **Clasificación / importancia**: dos columnas añadidas a mano a la tabla; no son de las 6 del
  encargo ni las he rellenado yo.

## Tabla priorizada

| Qué es                                                                                                                                               | Dónde está (línea que lo demuestra)                                                                                                                                                                                                                                                                                                                                                        | Qué rompe y quién lo nota                                                                                                                                                                                                                                                                                                                | Sitios a tocar (contados)                                                                                                                                                                                                                                                                    | ¿1 revert lo anula?                                                                                                                                                             | ¿Bloquea o desbloquea?                                                                                                                                                                                                                                                 | Clasificación | importancia                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------ |
| **H1 · Nivel 0.** Solo 1 de 18 comportamientos de comentarios tiene test: no hay red para tocar nada de lo demás.                                    | `backend/tests/functional/comentarios.spec.ts:15` es el único `test(` del archivo; `npm test` → `Tests 1 passed (1)`. Los 18: POST 6 salidas (`routes.ts:301,311,314,317,320,333`), DELETE 4 (404, 403, borra moderador, borra autor: `routes.ts:344,356,360`; la 360 cubre los dos últimos), PATCH 5 (`routes.ts:371,380`×2 condiciones, `385,392`), lecturas 3 (`routes.ts:75,152,223`). | Nadie por ahora. El primer refactor o corrección toca 17 comportamientos sin test que avise si cambia alguno (y `COBERTURA_MINIMA = 0`, `.claude/hooks/guard-tests.mjs:32`, tampoco lo frena).                                                                                                                                           | **1 archivo** (`backend/tests/functional/comentarios.spec.ts`), **17 escenarios** por añadir.                                                                                                                                                                                                | **Sí.** Solo añade tests, no toca código de producción.                                                                                                                         | **Desbloquea** A1, F2, M, F1, C1, E, N, D, K, A2 y C2 (todo lo que toca `routes.ts` o el esquema). No a G ni H (frontend: no hay ningún archivo de test versionado).                                                                                                   | Hecho         | 0, un test no pide de pasar con todo la base de datos. |
| **A1 · Nivel 1.** Contención: el detalle público devuelve el correo de quien comenta.                                                                | `routes.ts:152` `select * from comentarios where post_id = ? and estado = 'aprobado' …`. **Verificado en vivo** (`GET /posts/diez-tendencias-…`): el comentario 2 trae `autor_email: "marta.ruiz@corriente.es"`; claves devueltas: `autor_email, autor_nombre, creado_en, cuerpo, estado, id, padre_id, post_id`.                                                                          | Cualquier visitante sin login, con DevTools: lee el correo de cada comentarista (4 en la semilla: ids 1, 2, 6, 8). Incumple la regla 6 del dominio. El frontend no lo usa (`autor_email` solo aparece en `Comentarios.jsx:33`, para enviarlo), así que quitarlo no rompe la web. Además es la «contraseña» de DELETE/PATCH (ver N y C2). | **1** (la consulta de `routes.ts:152`: lista explícita de columnas `id, autor_nombre, cuerpo, creado_en, padre_id`).                                                                                                                                                                         | **Sí** el cambio (1 commit de código). **No** recupera los correos ya servidos.                                                                                                 | **Desbloquea parcialmente** N y C2: mientras el correo sea público, «ser el autor» (`routes.ts:353`, `routes.ts:379`) equivale a leer la respuesta. Bloqueado por H1.                                                                                                  | Hecho         | valido el nivel dado                                   |
| **F2 · Nivel 1.** `estado` es texto libre y hay 3 filas con valores que ninguna consulta reconoce.                                                   | `create_comentarios_table.ts:18` `table.string('estado').notNullable().defaultTo('pendiente')` (sin CHECK); semilla ids 3 y 9 `'Aprobado'`, id 4 `'ok'`; reconocido en `blog_seeder.ts:13`. BD local: 1 fila `Aprobado` (id 9) y 1 `ok` (id 4); la id 3 fue borrada.                                                                                                                       | Comentarios aprobados por un moderador que no se muestran: el detalle compara exacto (`routes.ts:152`). **Verificado en vivo**: post 6 (`que-mide-de-verdad-…`) → detalle `0` comentarios, aunque el comentario 9 está aprobado. Lo notan el lector (falta el comentario) y su autor.                                                    | **4**: 1 migración nueva con el `update` + 3 filas de la semilla (ids 3, 4, 9). Más las filas sucias de cualquier BD desplegada (sin medir).                                                                                                                                                 | **No.** La migración de datos ya aplicada no se deshace con un revert de código, y tras normalizar no queda rastro de cuál era `ok` y cuál `Aprobado`. Hace falta copia previa. | **Desbloquea** F1 (sin normalizar, igualar la regla esconde 3 comentarios legítimos del recuento) y K (no se puede añadir un CHECK con datos sucios). Bloqueado por H1.                                                                                                |               |                                                        |
| **M · Nivel 2.** Borrar un comentario deja huérfanas a sus respuestas.                                                                               | `routes.ts:359` `delete from comentarios where id = ?` — sin tocar hijos; la web solo pinta respuestas colgando de una raíz (`Comentarios.jsx:50` `raices = … !c.padre_id`, `Comentarios.jsx:63-64`). **BD local, verificado en la API**: comentario 2 (`aprobado`, `padre_id: 1`) cuyo padre 1 ya no existe; `GET /posts/diez-tendencias-…` lo devuelve (1 comentario).                   | Lector del post 1: la cabecera cuenta 1 (`DetallePost.jsx:38,71` usa `length`) y la lista no muestra nada (deducido del código; no abierto en navegador). Lo notan lectores y el autor de la respuesta.                                                                                                                                  | **1** (el handler `DELETE`, `routes.ts:359`) — más la decisión de producto: 409 si tiene respuestas, promoverlas o borrar en cascada.                                                                                                                                                        | **Sí** si la opción es 409 o promover (solo código). **No** si es borrar en cascada (destruye datos).                                                                           | **Bloquea** K (una FK sobre `padre_id` fallaría con la fila 2). Bloqueado por H1.                                                                                                                                                                                      |               |                                                        |
| **F1 · Nivel 2.** Dos reglas distintas para «comentario visible»: el detalle exige `aprobado`, los recuentos cuentan todo lo que no sea `pendiente`. | `routes.ts:75` `c.estado <> 'pendiente'` y `routes.ts:223` `estado <> 'pendiente'`, frente a `routes.ts:152` `estado = 'aprobado'`. **Verificado en vivo**: post 6 → listado `num_comentarios: 1`, detalle `0`. Calculado desde la semilla (no observado): post 1 → listado 4, detalle 2. Rompe la regla 5 del dominio.                                                                    | Todo lector de la portada (`ListaPosts.jsx:57`) y de relacionados (`PostsRelacionados.jsx:32`): ve «1 comentarios» y al entrar no hay ninguno. También contaría cualquier estado futuro (`rechazado`, `spam`).                                                                                                                           | **2** consultas (`routes.ts:75`, `routes.ts:223`).                                                                                                                                                                                                                                           | **Sí.** Solo código (cambia el número que ve el lector, no los datos).                                                                                                          | Depende de F2 (hacerlo antes de normalizar oculta 3 comentarios del recuento). No bloquea a otro. Bloqueado por H1.                                                                                                                                                    |               |                                                        |
| **C1 · Nivel 2.** Contención: la clave de moderación está escrita en el código y es pública.                                                         | `routes.ts:25` `const SECRETO_SESION = 'dev-secret-cambiar'`; se usa en `routes.ts:351` `const esModerador = clave === SECRETO_SESION`. Sigue en el historial (`git grep` en `b5da02a`, `ad34f0e`…).                                                                                                                                                                                       | Cualquiera que lea el repo envía `x-clave-moderacion: dev-secret-cambiar` y borra **cualquier** comentario (`DELETE`, borrado físico). No hay evidencia en el repo de que se haya usado; el `TODO(2024-11)` de `routes.ts:22` sigue sin hacerse.                                                                                         | **4** versionados: `routes.ts:25`, `routes.ts:351`, `backend/start/env.ts` (variable nueva) y `backend/.env.example`. Más el `.env` de cada entorno (no versionado, sin contar).                                                                                                             | **No.** El valor viejo queda en el historial de git: hay que darlo por comprometido y rotarlo en cada entorno; un revert lo vuelve a activar.                                   | Ninguno. C2 lo deja obsoleto. Bloqueado por H1.                                                                                                                                                                                                                        |               |                                                        |
| **E · Nivel 2.** `padre_id` se guarda sin comprobar que existe ni que es del mismo post.                                                             | `routes.ts:308` `const padre = request.input('padre_id', null)` → `routes.ts:326` va directo al `insert`. BD local: comentario 10 con `padre_id = 9999` (no existe) y comentario 11 con `padre_id = 6` (comentario del post 2, el suyo es el 1).                                                                                                                                           | Nadie por ahora: la web no envía `padre_id` (`Comentarios.jsx:33`), solo clientes directos de la API; pero 2 de 40 filas locales ya lo muestran, y si se aprueban desaparecen como en M.                                                                                                                                                 | **2** (`routes.ts:308` lectura y `routes.ts:326` inserción; la comprobación va entre ambas).                                                                                                                                                                                                 | **Sí.** Solo código.                                                                                                                                                            | **Bloquea** K (FK sobre `padre_id`). Bloqueado por H1.                                                                                                                                                                                                                 |               |                                                        |
| **N · Nivel 2.** `PATCH` reescribe a mano la regla de «quién es el autor» y sale distinta a la de `DELETE`, y no valida la longitud.                 | `routes.ts:379` `comentario.autor_email !== email \|\| comentario.estado !== 'pendiente'` frente a `routes.ts:353` (minúsculas + `trim`) y `routes.ts:351` (clave de moderación); `routes.ts:384` `if (!cuerpo)` frente a `routes.ts:319` `length < 5`.                                                                                                                                    | Nadie por ahora: la web no tiene botón de editar (ningún `PATCH` en `frontend/src`). Efecto latente: `Marta@x.es` borra pero no edita su comentario; se puede editar a 1 carácter.                                                                                                                                                       | **3** (`routes.ts:353`, `routes.ts:379`, `routes.ts:384`).                                                                                                                                                                                                                                   | **Sí.** Solo código.                                                                                                                                                            | Lo reduce A1 (el correo deja de ser público). A2 lo absorbe en un servicio único. Bloqueado por H1.                                                                                                                                                                    |               |                                                        |
| **D · Nivel 2.** El `POST` devuelve los errores de validación en cuatro formas distintas.                                                            | `routes.ts:311` 400 `{error}`, `routes.ts:314` 422 `{message}`, `routes.ts:317` 400 `{errores:[…]}`, `routes.ts:320` **200** `{ok:false, motivo}`. **Verificado en vivo** con los 4 casos. Frontend: `Comentarios.jsx:44` lee `d.error`, `d.message` y `d.motivo`, pero **no** `d.errores`.                                                                                                | Quien teclea un correo sin `@` ve «No se ha podido enviar.» sin saber por qué (es la única de las cuatro formas que el front no lee). Además la API responde 200 a un fallo. Lo nota cualquier lector que comente.                                                                                                                       | **5**: 4 salidas en el backend (`routes.ts:311,314,317,320`) + 1 línea en el frontend (`Comentarios.jsx:44`). Mínimo para el síntoma: 1 (`Comentarios.jsx:44` leyendo `d.errores`).                                                                                                          | **Sí**, si API y web van en el mismo commit. Un cliente externo que ya dependa de `200 {ok:false}` es desconocido (ver «sin medir»).                                            | Ninguno. Mismo archivo que G (`Comentarios.jsx`). Bloqueado por H1: cambiar códigos es cambiar contrato, requiere decisión explícita.                                                                                                                                  |               |                                                        |
| **G · Nivel 2.** Tres números distintos para el mismo recuento en la web.                                                                            | `Comentarios.jsx:39` `setTotal(total + 1)` al enviar (el comentario queda `pendiente` y no se muestra); `Comentarios.jsx:54` `<h2>{total} comentarios</h2>`; la cabecera es otro estado en `DetallePost.jsx:30,38,71`.                                                                                                                                                                     | Quien comenta ve «N+1 comentarios» sin que aparezca ninguno (y «N+2» si lo repite), mientras la cabecera del artículo sigue en N (deducido del código; no probado en navegador). Lo nota todo lector que comenta, al instante.                                                                                                           | **7 líneas en 2 archivos**: `Comentarios.jsx:11,23,39,54` y `DetallePost.jsx:30,38,71`. Mínimo para el síntoma: **1** (`Comentarios.jsx:39`).                                                                                                                                                | **Sí.** Solo frontend.                                                                                                                                                          | **Desbloquea** H (con el estado en `DetallePost`, `Comentarios` deja de pedir el post).                                                                                                                                                                                |               |                                                        |
| **K · Nivel 3.** La tabla no tiene clave foránea, índice ni CHECK.                                                                                   | `create_comentarios_table.ts:14` `table.integer('post_id').notNullable()`, `create_comentarios_table.ts:20` `table.integer('padre_id').nullable()`, `create_comentarios_table.ts:18` `estado` libre; el comentario de `create_comentarios_table.ts:4-6` lo admite. La consulta `routes.ts:75` hace una subconsulta correlada por post de la página, sobre una tabla sin índice.            | Nadie por ahora: 40 filas. Sin FK, un post borrado deja comentarios huérfanos (BD local: 0 hoy). Sin índice, `routes.ts:75` escanea la tabla por cada post del listado (no medido con datos reales).                                                                                                                                     | **1** migración nueva, **3** columnas (`post_id`, `padre_id`, `estado`). SQLite no permite `ADD CONSTRAINT`: hay que reconstruir la tabla (limitación conocida de SQLite, no probada aquí).                                                                                                  | **No.** Una migración aplicada no se deshace con un revert de código; `down()` tendría que reconstruir la tabla otra vez.                                                       | **Bloqueado por** F2, M y E (en la BD local, la FK y el CHECK fallarían con las filas 2, 10, 11 y los `ok`/`Aprobado`; y mientras M y E sigan sin corregirse, el código seguiría creando filas así).                                                                   |               |                                                        |
| **H · Nivel 3.** El post entero se pide dos veces por visita.                                                                                        | `DetallePost.jsx:35` y `Comentarios.jsx:19`: ambos hacen `fetch(API + '/posts/' + encodeURIComponent(slug))`.                                                                                                                                                                                                                                                                              | Nadie por ahora: segunda petición y segundo cuerpo del post descartado.                                                                                                                                                                                                                                                                  | **2** efectos (`DetallePost.jsx:32-43`, `Comentarios.jsx:17-26`).                                                                                                                                                                                                                            | **Sí.** Solo frontend.                                                                                                                                                          | **Bloqueado por** G (el estado compartido es el que permite pasar los comentarios por props).                                                                                                                                                                          |               |                                                        |
| **A2 · Nivel 4.** Corrección de fondo de A1: la feature entera vive en `routes.ts`, sin capas ni transformer.                                        | `routes.ts:295-393` (POST, DELETE, PATCH) con SQL, validación, reglas y forma de respuesta mezcladas; `routes.ts:152-155` el listado de comentarios dentro de `GET /posts/:slug`. Incumple la arquitectura de `CLAUDE.md`.                                                                                                                                                                 | Nadie por ahora. Cada corrección de arriba se hace dentro de un archivo de 418 líneas que mezcla los 5 recursos del blog más la autenticación, y la fuga de A1 solo queda cerrada para siempre cuando una capa de salida (transformer) decide qué campos salen.                                                                          | **12 sitios en 7 archivos**: 5 nuevos (controlador, validador, servicio, repositorio, transformer), el alias `#repositories/*` en `package.json` y 6 puntos en `routes.ts` (`:75`, `:152-155`, `:223`, POST, DELETE, PATCH). Dos de esos puntos (`:75`, `:223`) están en endpoints de posts. | **Sí**, si es refactor puro con H1 en verde (solo código, sin cambio de contrato).                                                                                              | **Desbloquea** C2 y absorbe D, E y N (validación y regla de autor en un solo sitio). Exige H1; conviene hacerlo después de A1, F1 y F2 para no arrastrar esos fallos a las capas nuevas (no es obligatorio: `CLAUDE.md` permite caracterizarlos y corregirlos aparte). |               |                                                        |
| **C2 · Nivel 4.** Corrección de fondo de C1: la «identidad» del autor es un correo que escribe el cliente y la moderación una clave compartida.      | `routes.ts:351-353` y `routes.ts:379`: tres comprobaciones distintas; `users` no tiene columna de rol (`backend/database/migrations/1761885935168_create_users_table.ts`), así que el sistema no sabe quién es moderador.                                                                                                                                                                  | Nadie por ahora (la web no llama a `PATCH` ni `DELETE`), pero la API es pública: quien sepa o adivine un correo (los 3 autores de la semilla usan `nombre.apellido@corriente.es`, p. ej. `marta.ruiz@corriente.es`) borra o edita.                                                                                                       | **5**: `DELETE` (`routes.ts:348-357`), `PATCH` (`routes.ts:378-381`), 1 migración de `users` (rol), 1 middleware nuevo, su registro en las rutas. Más la decisión de producto de cómo se prueba que alguien es el autor (sin medir).                                                         | **No.** Añade una columna a `users` (migración) y elimina la cabecera `x-clave-moderacion` del contrato.                                                                        | **Bloqueado por** A2 y H1. Hace obsoleto C1.                                                                                                                                                                                                                           |               |                                                        |

## Cómo se ordenó (daño ÷ radio)

Daño: mi juicio en escala 1–10 (qué pierde el usuario y cuánto se puede recuperar). Radio: la
columna 4 (sitios contados; para el mínimo viable se usa el valor entre paréntesis solo si lo
indico). La puntuación solo ordena dentro de cada nivel.

| Nivel | Hallazgo | Daño | Radio | Daño ÷ radio |
|---|---|---|---|---|
| 0 | H1 | — | 1 archivo | — (habilitador) |
| 1 | A1 | 9 | 1 | 9,0 |
| 1 | F2 | 5 | 4 | 1,25 |
| 2 | M | 4 | 1 | 4,0 |
| 2 | F1 | 5 | 2 | 2,5 |
| 2 | C1 | 9 | 4 | 2,25 |
| 2 | E | 3 | 2 | 1,5 |
| 2 | N | 3 | 3 | 1,0 |
| 2 | D | 3 | 5 | 0,6 |
| 2 | G | 4 | 7 | 0,57 |
| 3 | K | 3 | 3 | 1,0 |
| 3 | H | 1 | 2 | 0,5 |
| 4 | A2 | 9 (mismo daño que A1) | 12 | 0,75 |
| 4 | C2 | 9 (mismo daño que C1) | 5 | 1,8 |

A1 y C1 son los dos de máximo daño. Por la regla 3 del encargo (un hallazgo de máximo daño con precedencia baja se divide en dos líneas) cada uno se parte en **contención inmediata**
(A1, C1: 1 y 4 sitios, arriba) y **corrección de fondo** (A2, C2: nivel 4, porque dependen de capas y
de la decisión de producto sobre identidad).

## Fuera de la tabla: propuestas sin medir

Cada una dice qué habría que medir para entrar en la tabla.

1. **`POST` devuelve la fila equivocada bajo concurrencia.** `routes.ts:329-331`
   `select * from comentarios order by id desc limit 1` no está acotado al `insert` de `routes.ts:324`; con dos `POST` solapados, uno podría recibir (con el correo incluido) el comentario del otro.
   *Medir*: lanzar N `POST` concurrentes contra una BD de pruebas y contar respuestas cuyo
   `autor_email` ≠ el enviado. El defecto está en el código; su frecuencia, no medida.
2. **No existe ruta para aprobar o rechazar.** No hay ningún `router.*` que cambie `estado`
   (`routes.ts` completo): un comentario `pendiente` solo sale de ese estado por SQL manual.
   BD local: 35 de 40 `pendiente`. *Medir*: cómo se modera hoy en el entorno real y cuántos
   `pendiente` antiguos acumula.
3. **Sin límite de longitud ni de frecuencia.** `routes.ts:310-321` solo exige no vacío, `@` y 5 caracteres mínimos; no hay máximo ni límite de peticiones. *Medir*: el límite de `config/bodyparser.ts` y qué pasa con un `cuerpo` de varios MB.
4. **¿Alguien usa `PATCH`, `DELETE` o `padre_id`?** La web no. De la respuesta depende subir o
   bajar la prioridad de N, C1 y C2. *Medir*: logs de acceso de la API real.
5. **¿Están activas las claves foráneas de SQLite?** Condiciona cómo se haría K (`PRAGMA
   foreign_keys` es por conexión). *Medir*: `PRAGMA foreign_keys` desde la conexión de Lucid.
6. **Fecha mostrada.** `routes.ts:323` `new Date().toISOString()` guarda UTC sin zona y la web corta con `substring(0, 10)` (`Comentarios.jsx:59`): un comentario a la 01:00 hora de España se muestra con la fecha del día anterior. *Medir*: la zona horaria real de los lectores y cuántos comentarios caen en otro día.
7. **Coste de la subconsulta `routes.ts:75` sin índice.** *Medir*: `EXPLAIN QUERY PLAN` y tiempo de `GET /posts` con ≥ 10 000 comentarios.
8. **Clientes externos de la API.** Si algo fuera del repo depende de `200 {ok:false}` (D) o de
   que `autor_email` esté en la respuesta (A1), el revert de esas correcciones no es gratis.
   *Medir*: consumidores registrados de la API.

## Lo que este documento daba por supuesto (auditoría del propio informe)

**Correcciones que hice al releerlo**

1. **N**: puntué el radio como 2 cuando la columna «Sitios a tocar» dice 3. Corregido: 1,0, no 1,5
   (el orden no cambia).
2. **C1**: decía «nadie lo ha notado todavía». No tengo evidencia de eso; ahora dice que no hay
   evidencia de uso en el repo.
3. **C2**: decía que los correos de los editores «siguen un patrón» sin haberlo comprobado. Lo he comprobado en la semilla: los 3 autores usan `nombre.apellido@corriente.es`.
4. **A2**: decía «8 recursos» en `routes.ts`; son 5 recursos del blog más la autenticación. También decía «bloqueado por A1, F1, F2», pero la regla solo exige H1; lo demás es conveniencia.
5. **F2**: el texto `Aprobado\|1, ok\|1` era una salida de SQLite sin traducir.

**Decisiones mías que cambian el orden y que puedes discutir**

- **El «daño» (1–10) es mi juicio, no una medida.** Decide el orden dentro de cada nivel. Con él,
  M (4,0) queda por delante de C1 (2,25), aunque C1 permite que cualquiera borre cualquier comentario.
  Si valoras más el borrado ajeno que la integridad de las respuestas, C1 pasa a ser el primero del nivel 2.
- **A2 va antes que C2 pese a tener menor ratio (0,75 frente a 1,8)** porque C2 depende de A2: la precedencia manda sobre el ratio.
- **«Revert»** lo interpreté como «revertir la corrección». Si querías «revertir el estado actual»
  (deshacer el daño ya hecho), las respuestas de A1, C1 y F2 serían todas «No».
- **«Sitios a tocar»** no incluye los tests ni los entornos desplegados.

**Qué se verificó y qué no**

| Hallazgo | Cómo lo sé |
|---|---|
| A1, F2 (post 6), F1 (post 6), D | Verificado en vivo contra la API local |
| M (la API devuelve el comentario 2 con padre 1 ausente) | Verificado en vivo; que **la web** lo pinte mal es deducido del código |
| H1, E, N, C1, K, H, A2, C2 | Leído en el código o en la BD local; no ejecutado |
| G, y el listado del post 1 en F1 | Deducido o calculado, no observado |
| Fila «SQLite no permite ADD CONSTRAINT» (K) | Conocimiento general, no probado aquí |

**Límites del informe**

- La BD local no es la semilla (40 comentarios frente a 9, ids 1 y 3 borrados, 30 filas de pruebas), así que cifras como «35 de 40 pendientes» o «2 de 40 con padre inválido» describen **esta máquina**, no el producto.
- No hay datos de producción ni de tráfico: toda mención a «quién lo nota» es razonamiento sobre el código, salvo donde dice «verificado».
- No abrí el navegador. Lo que dice la web (G, M) sale de leer los componentes.
- El frontend repite `const API = 'http://localhost:3401'` en 6 archivos. No es específico de comentarios y no se cuenta.

---

PARTE B

1. **Cuántos hallazgos devolvió el agente, y cuántos comprobaste tú abriendo el archivo.** Los dos números, tal cual salieron. No los redondees ni los expliques.

14 / 2

2. **El hallazgo del que no supiste decidir la prioridad**, y en una frase, por qué. Lo que interesa es **qué dos cosas se contradecían**: lo grave contra lo que bloquea, lo urgente contra lo caro, lo que te pedían contra lo que veías.

Creo que esto se resolvió con varios factores: el tiempo para comprender la salida de la IA y el tiempo para entender el proyecto también, ya que no conozco TypeScript. Eran puntos 1 poco complicados. Pero al hacerle algunas preguntas a la IA, aclaró la salida que proporcionó. Sin embargo, es cierto que es una salida bastante compleja de leer. Y por lo tanto, con el tiempo, uno debe acostumbrarse, supongo.

También añadiría que el ejercicio no es muy claro y, por lo tanto, no es evidente saber con claridad qué hacer de antemano; por consiguiente, esto también consume tiempo de las 45 minutos que nos han sido asignadas. Pero, en todo caso, permite tomar el tiempo necesario para la reflexión.

3. **Algo que el agente afirmó y no pudiste verificar.** Ojo al matiz: no es lo que dijo mal. Es lo que **no pudiste comprobar ni a favor ni en contra**, y te tocó dejar en el aire.

Hasta ahora, todo lo que he leído me parecía verificable. Sin embargo, el primer punto que me ha destacado es que no hay todas las pruebas: no existe una prueba para cada línea de la base de datos. Esto me pareció 1 poco extraño, ya que se trata de ejemplos. Por lo general, se establece una prueba general y no es necesario crear una prueba para cada caso. Además, fue algo que decidió priorizar principalmente. Por ello, me resultó 1 poco desconcertante.