import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Caracterización de los tres endpoints de comentarios:
 *
 *   POST   /posts/:slug/comentarios
 *   DELETE /comentarios/:id
 *   PATCH  /comentarios/:id
 *
 * Fija lo que el sistema hace HOY, bugs incluidos. Los tests marcados con «BUG» afirman un
 * comportamiento que NO es el deseado: documentan el defecto y se sustituyen por otro test
 * el día que se decida corregirlo (tarea aparte, con su propia decisión). Los códigos del
 * hallazgo (H1, H2…) son los de `docs/auditoria/comentarios.md`.
 */

const POST_ID = 9001
const SLUG = 'post-de-prueba'

// BUG H3: la clave de moderación está escrita en el código. Se afirma tal cual está hoy.
const CLAVE_MODERACION = 'dev-secret-cambiar'

const CAMPOS_COMENTARIO = [
  'id',
  'post_id',
  'autor_nombre',
  'autor_email',
  'cuerpo',
  'estado',
  'creado_en',
  'padre_id',
]

function unPostPublicado(extra: Record<string, unknown> = {}) {
  return {
    id: POST_ID,
    titulo: 'Post de prueba',
    slug: SLUG,
    resumen: 'Resumen de prueba',
    cuerpo: '## Cuerpo de prueba',
    imagen_portada: null,
    estado: 'publicado',
    publicado_en: '2026-01-01 10:00:00',
    autor_id: 1,
    categoria_id: 1,
    autor_nombre: 'Marta Ruiz Calvo',
    autor_email: 'marta.ruiz@corriente.es',
    categoria_nombre: 'Noticias',
    etiquetas: 'Artículos',
    created_at: '2026-01-01 10:00:00',
    updated_at: '2026-01-01 10:00:00',
    ...extra,
  }
}

function unComentario(extra: Record<string, unknown> = {}) {
  return {
    id: 9101,
    post_id: POST_ID,
    autor_nombre: 'Ana Cortés',
    autor_email: 'ana.cortes@ejemplo.es',
    cuerpo: 'Un comentario de prueba.',
    estado: 'pendiente',
    creado_en: '2026-03-15 10:12:00',
    padre_id: null,
    ...extra,
  }
}

/**
 * Afirma el contrato COMPLETO de un comentario en la respuesta: las claves exactas y el tipo
 * de cada una. Las fechas y los ids son volátiles en el POST: aquí solo se afirma su forma.
 */
function afirmarContratoComentario(assert: any, comentario: any) {
  assert.sameMembers(Object.keys(comentario), CAMPOS_COMENTARIO)
  assert.isNumber(comentario.id)
  assert.isNumber(comentario.post_id)
  assert.isString(comentario.autor_nombre)
  assert.isString(comentario.autor_email)
  assert.isString(comentario.cuerpo)
  assert.isString(comentario.estado)
  assert.isString(comentario.creado_en)
  assert.isTrue(comentario.padre_id === null || typeof comentario.padre_id === 'number')
}

test.group('POST /posts/:slug/comentarios', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('deja un comentario pendiente y devuelve el contrato completo', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client.post(`/posts/${SLUG}/comentarios`).json({
      autor_nombre: 'Lucía Ferrer',
      autor_email: 'lucia.ferrer@ejemplo.es',
      cuerpo: 'Un comentario suficientemente largo.',
    })

    // Assert
    respuesta.assertStatus(201)
    assert.sameMembers(Object.keys(respuesta.body()), ['comentario'])
    const comentario = respuesta.body().comentario
    afirmarContratoComentario(assert, comentario)
    assert.equal(comentario.post_id, POST_ID)
    assert.equal(comentario.autor_nombre, 'Lucía Ferrer')
    assert.equal(comentario.cuerpo, 'Un comentario suficientemente largo.')
    assert.equal(comentario.estado, 'pendiente')
    assert.isNull(comentario.padre_id)
    // Valor volátil: se afirma la forma, no el valor.
    assert.match(comentario.creado_en, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  })

  test('BUG H1: el correo de quien comenta sale en la respuesta', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client.post(`/posts/${SLUG}/comentarios`).json({
      autor_nombre: 'Lucía Ferrer',
      autor_email: 'lucia.ferrer@ejemplo.es',
      cuerpo: 'Un comentario suficientemente largo.',
    })

    // Assert — hoy se filtra; el día que se corrija este test se sustituye por notProperty.
    respuesta.assertStatus(201)
    assert.equal(respuesta.body().comentario.autor_email, 'lucia.ferrer@ejemplo.es')
  })

  test('guarda el comentario como pendiente y la fecha en UTC', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    const antes = Date.now()

    // Act
    await client.post(`/posts/${SLUG}/comentarios`).json({
      autor_nombre: 'Lucía Ferrer',
      autor_email: 'lucia.ferrer@ejemplo.es',
      cuerpo: 'Un comentario suficientemente largo.',
    })

    // Assert
    const filas = await db.from('comentarios').where('post_id', POST_ID)
    assert.lengthOf(filas, 1)
    assert.equal(filas[0].estado, 'pendiente')
    assert.equal(filas[0].autor_email, 'lucia.ferrer@ejemplo.es')
    assert.isNull(filas[0].padre_id)
    const guardado = Date.parse(filas[0].creado_en.replace(' ', 'T') + 'Z')
    assert.isBelow(Math.abs(guardado - antes), 60_000)
  })

  test('el comentario pendiente no aparece en el detalle del post (regla 2)', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    await client.post(`/posts/${SLUG}/comentarios`).json({
      autor_nombre: 'Lucía Ferrer',
      autor_email: 'lucia.ferrer@ejemplo.es',
      cuerpo: 'Un comentario suficientemente largo.',
    })
    const detalle = await client.get(`/posts/${SLUG}`)

    // Assert
    detalle.assertStatus(200)
    assert.deepEqual(detalle.body().comentarios, [])
  })

  test('sin nombre: 400 {error}', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client.post(`/posts/${SLUG}/comentarios`).json({
      autor_email: 'lucia.ferrer@ejemplo.es',
      cuerpo: 'Un comentario suficientemente largo.',
    })

    // Assert
    respuesta.assertStatus(400)
    respuesta.assertBody({ error: 'El nombre es obligatorio' })
    assert.lengthOf(await db.from('comentarios').where('post_id', POST_ID), 0)
  })

  test('con el nombre vacío: 400 {error}', async ({ client }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client.post(`/posts/${SLUG}/comentarios`).json({
      autor_nombre: '',
      autor_email: 'lucia.ferrer@ejemplo.es',
      cuerpo: 'Un comentario suficientemente largo.',
    })

    // Assert
    respuesta.assertStatus(400)
    respuesta.assertBody({ error: 'El nombre es obligatorio' })
  })

  test('sin correo: 422 {message}', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client.post(`/posts/${SLUG}/comentarios`).json({
      autor_nombre: 'Lucía Ferrer',
      cuerpo: 'Un comentario suficientemente largo.',
    })

    // Assert
    respuesta.assertStatus(422)
    respuesta.assertBody({ message: 'Falta el email' })
    assert.lengthOf(await db.from('comentarios').where('post_id', POST_ID), 0)
  })

  test('con el correo vacío: 422 {message}', async ({ client }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client.post(`/posts/${SLUG}/comentarios`).json({
      autor_nombre: 'Lucía Ferrer',
      autor_email: '',
      cuerpo: 'Un comentario suficientemente largo.',
    })

    // Assert
    respuesta.assertStatus(422)
    respuesta.assertBody({ message: 'Falta el email' })
  })

  test('correo sin arroba: 400 {errores}', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client.post(`/posts/${SLUG}/comentarios`).json({
      autor_nombre: 'Lucía Ferrer',
      autor_email: 'lucia.ferrer.ejemplo.es',
      cuerpo: 'Un comentario suficientemente largo.',
    })

    // Assert
    respuesta.assertStatus(400)
    respuesta.assertBody({ errores: ['email no válido'] })
    assert.lengthOf(await db.from('comentarios').where('post_id', POST_ID), 0)
  })

  test('BUG H9: un cuerpo de menos de 5 caracteres responde 200 {ok:false}', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client.post(`/posts/${SLUG}/comentarios`).json({
      autor_nombre: 'Lucía Ferrer',
      autor_email: 'lucia.ferrer@ejemplo.es',
      cuerpo: 'abcd',
    })

    // Assert — un error con código 200: hoy es el contrato.
    respuesta.assertStatus(200)
    respuesta.assertBody({ ok: false, motivo: 'comentario demasiado corto' })
    assert.lengthOf(await db.from('comentarios').where('post_id', POST_ID), 0)
  })

  test('BUG H9: sin cuerpo también responde 200 {ok:false}', async ({ client }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client.post(`/posts/${SLUG}/comentarios`).json({
      autor_nombre: 'Lucía Ferrer',
      autor_email: 'lucia.ferrer@ejemplo.es',
    })

    // Assert
    respuesta.assertStatus(200)
    respuesta.assertBody({ ok: false, motivo: 'comentario demasiado corto' })
  })

  test('con varios fallos gana el primero: nombre, luego correo, luego cuerpo', async ({
    client,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const sinNada = await client.post(`/posts/${SLUG}/comentarios`).json({})
    const correoMalo = await client.post(`/posts/${SLUG}/comentarios`).json({
      autor_nombre: 'Lucía Ferrer',
      autor_email: 'sin-arroba',
      cuerpo: 'abc',
    })
    const sinCorreoYCuerpoCorto = await client.post(`/posts/${SLUG}/comentarios`).json({
      autor_nombre: 'Lucía Ferrer',
      cuerpo: 'abc',
    })

    // Assert
    sinNada.assertStatus(400)
    sinNada.assertBody({ error: 'El nombre es obligatorio' })
    correoMalo.assertStatus(400)
    correoMalo.assertBody({ errores: ['email no válido'] })
    sinCorreoYCuerpoCorto.assertStatus(422)
    sinCorreoYCuerpoCorto.assertBody({ message: 'Falta el email' })
  })

  test('post inexistente: 404', async ({ client }) => {
    // Arrange — no hay ningún post con ese slug

    // Act
    const respuesta = await client.post('/posts/no-existe/comentarios').json({
      autor_nombre: 'Lucía Ferrer',
      autor_email: 'lucia.ferrer@ejemplo.es',
      cuerpo: 'Un comentario suficientemente largo.',
    })

    // Assert
    respuesta.assertStatus(404)
    respuesta.assertBody({ error: 'Post no encontrado' })
  })

  test('post en borrador: 404, no se puede comentar (regla 1)', async ({ client, assert }) => {
    // Arrange
    await db
      .table('posts')
      .insert(unPostPublicado({ id: 9002, slug: 'post-borrador', estado: 'borrador' }))

    // Act
    const respuesta = await client.post('/posts/post-borrador/comentarios').json({
      autor_nombre: 'Lucía Ferrer',
      autor_email: 'lucia.ferrer@ejemplo.es',
      cuerpo: 'Un comentario suficientemente largo.',
    })

    // Assert
    respuesta.assertStatus(404)
    respuesta.assertBody({ error: 'Post no encontrado' })
    assert.lengthOf(await db.from('comentarios').where('post_id', 9002), 0)
  })

  test('el 404 del post gana a la validación del cuerpo', async ({ client }) => {
    // Arrange — slug inexistente Y entrada vacía

    // Act
    const respuesta = await client.post('/posts/no-existe/comentarios').json({})

    // Assert
    respuesta.assertStatus(404)
    respuesta.assertBody({ error: 'Post no encontrado' })
  })

  test('BUG H7: acepta un padre_id que no existe', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client.post(`/posts/${SLUG}/comentarios`).json({
      autor_nombre: 'Lucía Ferrer',
      autor_email: 'lucia.ferrer@ejemplo.es',
      cuerpo: 'Un comentario suficientemente largo.',
      padre_id: 424242,
    })

    // Assert
    respuesta.assertStatus(201)
    assert.equal(respuesta.body().comentario.padre_id, 424242)
  })

  test('acepta un padre_id real', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario({ estado: 'aprobado' }))

    // Act
    const respuesta = await client.post(`/posts/${SLUG}/comentarios`).json({
      autor_nombre: 'Lucía Ferrer',
      autor_email: 'lucia.ferrer@ejemplo.es',
      cuerpo: 'Una respuesta suficientemente larga.',
      padre_id: 9101,
    })

    // Assert
    respuesta.assertStatus(201)
    assert.equal(respuesta.body().comentario.padre_id, 9101)
  })

  test('DESVIACIÓN DEL REFACTOR: un nombre o un cuerpo que no son texto se rechazan', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    const valido = {
      autor_nombre: 'Lucía Ferrer',
      autor_email: 'lucia.ferrer@ejemplo.es',
      cuerpo: 'Un comentario suficientemente largo.',
    }

    // Act
    const nombreNumerico = await client
      .post(`/posts/${SLUG}/comentarios`)
      .json({ ...valido, autor_nombre: 123 })
    const cuerpoNumerico = await client
      .post(`/posts/${SLUG}/comentarios`)
      .json({ ...valido, cuerpo: 12345 })

    // Assert — el legacy los aceptaba y guardaba «123.0» y «12345.0» (y un array daba 500).
    // El validador VineJS exige texto. La web solo envía texto, así que nadie lo nota.
    nombreNumerico.assertStatus(400)
    nombreNumerico.assertBody({ error: 'El nombre es obligatorio' })
    cuerpoNumerico.assertStatus(200)
    cuerpoNumerico.assertBody({ ok: false, motivo: 'comentario demasiado corto' })
    assert.lengthOf(await db.from('comentarios').where('post_id', POST_ID), 0)
  })

  test('BUG H8: un correo que es solo «@» pasa la validación', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client.post(`/posts/${SLUG}/comentarios`).json({
      autor_nombre: 'Lucía Ferrer',
      autor_email: '@',
      cuerpo: 'Un comentario suficientemente largo.',
    })

    // Assert
    respuesta.assertStatus(201)
    assert.equal(respuesta.body().comentario.autor_email, '@')
  })

  test('el parser del cuerpo recorta los espacios antes de que el endpoint los vea', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const conEspacios = await client.post(`/posts/${SLUG}/comentarios`).json({
      autor_nombre: '  Lucía Ferrer ',
      autor_email: ' lucia.ferrer@ejemplo.es ',
      cuerpo: '  Cuerpo con espacios.  ',
    })
    const nombreEnBlanco = await client.post(`/posts/${SLUG}/comentarios`).json({
      autor_nombre: '   ',
      autor_email: 'lucia.ferrer@ejemplo.es',
      cuerpo: 'Un comentario suficientemente largo.',
    })
    const cuerpoEnBlanco = await client.post(`/posts/${SLUG}/comentarios`).json({
      autor_nombre: 'Lucía Ferrer',
      autor_email: 'lucia.ferrer@ejemplo.es',
      cuerpo: '     ',
    })

    // Assert — se guarda recortado; lo que queda en blanco cuenta como ausente.
    conEspacios.assertStatus(201)
    assert.equal(conEspacios.body().comentario.autor_nombre, 'Lucía Ferrer')
    assert.equal(conEspacios.body().comentario.autor_email, 'lucia.ferrer@ejemplo.es')
    assert.equal(conEspacios.body().comentario.cuerpo, 'Cuerpo con espacios.')
    nombreEnBlanco.assertStatus(400)
    nombreEnBlanco.assertBody({ error: 'El nombre es obligatorio' })
    cuerpoEnBlanco.assertStatus(200)
    cuerpoEnBlanco.assertBody({ ok: false, motivo: 'comentario demasiado corto' })
  })
})

test.group('DELETE /comentarios/:id', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('el autor borra su comentario: 200 {borrado:true} y la fila desaparece', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .json({ autor_email: 'ana.cortes@ejemplo.es' })

    // Assert
    respuesta.assertStatus(200)
    respuesta.assertBody({ borrado: true })
    assert.lengthOf(await db.from('comentarios').where('id', 9101), 0)
  })

  test('el correo se compara sin mayúsculas ni espacios', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .json({ autor_email: '  ANA.Cortes@Ejemplo.ES ' })

    // Assert
    respuesta.assertStatus(200)
    respuesta.assertBody({ borrado: true })
    assert.lengthOf(await db.from('comentarios').where('id', 9101), 0)
  })

  test('el correo también se acepta por query string', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .qs({ autor_email: 'ana.cortes@ejemplo.es' })

    // Assert
    respuesta.assertStatus(200)
    respuesta.assertBody({ borrado: true })
    assert.lengthOf(await db.from('comentarios').where('id', 9101), 0)
  })

  test('se puede borrar un comentario ya aprobado: el estado no cuenta', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario({ estado: 'aprobado' }))

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .json({ autor_email: 'ana.cortes@ejemplo.es' })

    // Assert
    respuesta.assertStatus(200)
    assert.lengthOf(await db.from('comentarios').where('id', 9101), 0)
  })

  test('BUG H3: quien trae la clave de moderación borra sin dar correo', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .header('x-clave-moderacion', CLAVE_MODERACION)

    // Assert
    respuesta.assertStatus(200)
    respuesta.assertBody({ borrado: true })
    assert.lengthOf(await db.from('comentarios').where('id', 9101), 0)
  })

  test('un correo ajeno sin clave: 403 y la fila sigue', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .json({ autor_email: 'otra.persona@ejemplo.es' })

    // Assert
    respuesta.assertStatus(403)
    respuesta.assertBody({ error: 'No puedes borrar este comentario' })
    assert.lengthOf(await db.from('comentarios').where('id', 9101), 1)
  })

  test('sin correo ni clave: 403', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client.delete('/comentarios/9101')

    // Assert
    respuesta.assertStatus(403)
    respuesta.assertBody({ error: 'No puedes borrar este comentario' })
    assert.lengthOf(await db.from('comentarios').where('id', 9101), 1)
  })

  test('una clave de moderación equivocada no vale: 403', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .header('x-clave-moderacion', 'otra-clave')

    // Assert
    respuesta.assertStatus(403)
    respuesta.assertBody({ error: 'No puedes borrar este comentario' })
    assert.lengthOf(await db.from('comentarios').where('id', 9101), 1)
  })

  test('comentario inexistente: 404', async ({ client }) => {
    // Arrange — no hay ningún comentario con ese id

    // Act
    const respuesta = await client
      .delete('/comentarios/424242')
      .json({ autor_email: 'ana.cortes@ejemplo.es' })

    // Assert
    respuesta.assertStatus(404)
    respuesta.assertBody({ error: 'Comentario no encontrado' })
  })

  test('BUG H10: borrar un comentario deja huérfanas a sus respuestas', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario({ estado: 'aprobado' }))
    await db
      .table('comentarios')
      .insert(unComentario({ id: 9102, estado: 'aprobado', padre_id: 9101, cuerpo: 'Respuesta.' }))

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .json({ autor_email: 'ana.cortes@ejemplo.es' })

    // Assert — la respuesta sigue ahí, apuntando a un padre que ya no existe.
    respuesta.assertStatus(200)
    assert.lengthOf(await db.from('comentarios').where('id', 9101), 0)
    const hija = await db.from('comentarios').where('id', 9102).first()
    assert.equal(hija.padre_id, 9101)
  })
})

test.group('PATCH /comentarios/:id', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('el autor edita su comentario pendiente y recibe el contrato completo', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'ana.cortes@ejemplo.es', cuerpo: 'Cuerpo editado.' })

    // Assert
    respuesta.assertStatus(200)
    assert.sameMembers(Object.keys(respuesta.body()), ['comentario'])
    afirmarContratoComentario(assert, respuesta.body().comentario)
    // La fila de partida es un fixture con valores estables: aquí sí se fija todo.
    respuesta.assertBody({
      comentario: {
        id: 9101,
        post_id: POST_ID,
        autor_nombre: 'Ana Cortés',
        autor_email: 'ana.cortes@ejemplo.es',
        cuerpo: 'Cuerpo editado.',
        estado: 'pendiente',
        creado_en: '2026-03-15 10:12:00',
        padre_id: null,
      },
    })
    const fila = await db.from('comentarios').where('id', 9101).first()
    assert.equal(fila.cuerpo, 'Cuerpo editado.')
    assert.equal(fila.estado, 'pendiente')
  })

  test('BUG H1: el correo de quien comenta sale también en la respuesta del PATCH', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'ana.cortes@ejemplo.es', cuerpo: 'Cuerpo editado.' })

    // Assert
    respuesta.assertStatus(200)
    assert.equal(respuesta.body().comentario.autor_email, 'ana.cortes@ejemplo.es')
  })

  test('un comentario sin fecha de creación devuelve creado_en null', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario({ creado_en: null }))

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'ana.cortes@ejemplo.es', cuerpo: 'Cuerpo editado.' })

    // Assert
    respuesta.assertStatus(200)
    assert.isNull(respuesta.body().comentario.creado_en)
  })

  test('BUG H11: un cuerpo de un solo carácter se acepta', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'ana.cortes@ejemplo.es', cuerpo: 'x' })

    // Assert — el POST exige 5; el PATCH no.
    respuesta.assertStatus(200)
    assert.equal(respuesta.body().comentario.cuerpo, 'x')
  })

  test('sin cuerpo: 400 {error}', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'ana.cortes@ejemplo.es' })

    // Assert
    respuesta.assertStatus(400)
    respuesta.assertBody({ error: 'Falta el cuerpo' })
    const fila = await db.from('comentarios').where('id', 9101).first()
    assert.equal(fila.cuerpo, 'Un comentario de prueba.')
  })

  test('con el cuerpo vacío: 400 {error}', async ({ client }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'ana.cortes@ejemplo.es', cuerpo: '' })

    // Assert
    respuesta.assertStatus(400)
    respuesta.assertBody({ error: 'Falta el cuerpo' })
  })

  test('un correo ajeno: 403 y el cuerpo no cambia', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'otra.persona@ejemplo.es', cuerpo: 'Cuerpo editado.' })

    // Assert
    respuesta.assertStatus(403)
    respuesta.assertBody({ error: 'No puedes editar este comentario' })
    const fila = await db.from('comentarios').where('id', 9101).first()
    assert.equal(fila.cuerpo, 'Un comentario de prueba.')
  })

  test('BUG H11: aquí el correo se compara exacto, con mayúsculas (en DELETE no)', async ({
    client,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'ANA.Cortes@ejemplo.es', cuerpo: 'Cuerpo editado.' })

    // Assert
    respuesta.assertStatus(403)
    respuesta.assertBody({ error: 'No puedes editar este comentario' })
  })

  test('un comentario ya aprobado no se edita, ni siquiera por su autor: 403', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario({ estado: 'aprobado' }))

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'ana.cortes@ejemplo.es', cuerpo: 'Cuerpo editado.' })

    // Assert
    respuesta.assertStatus(403)
    respuesta.assertBody({ error: 'No puedes editar este comentario' })
    const fila = await db.from('comentarios').where('id', 9101).first()
    assert.equal(fila.cuerpo, 'Un comentario de prueba.')
  })

  test('BUG H2: la clave de moderación no sirve para editar', async ({ client }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .header('x-clave-moderacion', CLAVE_MODERACION)
      .json({ cuerpo: 'Cuerpo editado.' })

    // Assert
    respuesta.assertStatus(403)
    respuesta.assertBody({ error: 'No puedes editar este comentario' })
  })

  test('sin correo: 403', async ({ client }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client.patch('/comentarios/9101').json({ cuerpo: 'Cuerpo editado.' })

    // Assert
    respuesta.assertStatus(403)
    respuesta.assertBody({ error: 'No puedes editar este comentario' })
  })

  test('el 403 gana al 400: sin permiso y sin cuerpo responde 403', async ({ client }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'otra.persona@ejemplo.es' })

    // Assert
    respuesta.assertStatus(403)
    respuesta.assertBody({ error: 'No puedes editar este comentario' })
  })

  test('comentario inexistente: 404', async ({ client }) => {
    // Arrange — no hay ningún comentario con ese id

    // Act
    const respuesta = await client
      .patch('/comentarios/424242')
      .json({ autor_email: 'ana.cortes@ejemplo.es', cuerpo: 'Cuerpo editado.' })

    // Assert
    respuesta.assertStatus(404)
    respuesta.assertBody({ error: 'Comentario no encontrado' })
  })
})
