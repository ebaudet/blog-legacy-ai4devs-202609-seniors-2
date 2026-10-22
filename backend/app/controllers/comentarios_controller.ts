import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { ComentarioService } from '#services/comentario_service'
import ComentarioTransformer from '#transformers/comentario_transformer'
import { crearComentarioValidator, editarComentarioValidator } from '#validators/comentario'

@inject()
export default class ComentariosController {
  constructor(protected comentarios: ComentarioService) {}

  /** POST /posts/:slug/comentarios — deja un comentario pendiente de moderar. */
  async store({ params, request, response, serialize }: HttpContext) {
    // El 404 del post va antes que la validación: es el orden que tiene el contrato hoy.
    const post = await this.comentarios.postPublicado(params.slug)
    const datos = await request.validateUsing(crearComentarioValidator)
    const comentario = await this.comentarios.crear(post, datos)

    response.status(201)
    return serialize.withoutWrapping({ comentario: ComentarioTransformer.transform(comentario) })
  }

  /** DELETE /comentarios/:id — borra un comentario. */
  async destroy({ params, request }: HttpContext) {
    await this.comentarios.borrar(params.id, {
      claveModeracion: request.header('x-clave-moderacion'),
      autorEmail: request.input('autor_email', ''),
    })

    return { borrado: true }
  }

  /** PATCH /comentarios/:id — edita el cuerpo de un comentario pendiente. */
  async update({ params, request, serialize }: HttpContext) {
    // El permiso (403) se comprueba antes que el cuerpo (400): es el orden que tiene hoy.
    const comentario = await this.comentarios.paraEditar(
      params.id,
      request.input('autor_email', '')
    )
    const { cuerpo } = await request.validateUsing(editarComentarioValidator)
    await this.comentarios.editar(comentario, cuerpo)

    return serialize.withoutWrapping({ comentario: ComentarioTransformer.transform(comentario) })
  }
}
