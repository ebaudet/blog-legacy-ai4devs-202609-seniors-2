import { inject } from '@adonisjs/core'
import type Comentario from '#models/comentario'
import type Post from '#models/post'
import ErrorContratoException from '#exceptions/error_contrato_exception'
import ComentarioRepository from '#repositories/comentario_repository'
import PostRepository from '#repositories/post_repository'

/**
 * Clave con la que cualquiera puede borrar cualquier comentario.
 *
 * BUG H3 (caracterizado, se corrige aparte): está escrita en el código y versionada.
 * TODO(2024-11): sacarla a variables de entorno antes de subir a producción.
 */
const CLAVE_MODERACION = 'dev-secret-cambiar'

export type NuevoComentario = {
  autor_nombre: string
  autor_email: string
  cuerpo: string
  padre_id?: unknown
}

@inject()
export class ComentarioService {
  constructor(
    protected comentarios: ComentarioRepository,
    protected posts: PostRepository
  ) {}

  /** Un post en borrador no existe de cara al público: tampoco se puede comentar. */
  async postPublicado(slug: string) {
    const post = await this.posts.publicadoPorSlug(slug)
    if (!post) {
      throw new ErrorContratoException({ error: 'Post no encontrado' }, 404)
    }
    return post
  }

  /** El comentario nace siempre `pendiente`: hasta que se modere no se muestra. */
  crear(post: Post, datos: NuevoComentario) {
    return this.comentarios.crear({
      postId: post.id,
      autorNombre: datos.autor_nombre,
      autorEmail: datos.autor_email,
      cuerpo: datos.cuerpo,
      padreId: datos.padre_id,
    })
  }

  /**
   * Puede borrar quien lo escribió o cualquiera que traiga la clave de moderación.
   * Aquí el correo se compara sin mayúsculas ni espacios; en `paraEditar`, no.
   */
  async borrar(id: string, quien: { claveModeracion?: string; autorEmail: unknown }) {
    const comentario = await this.buscarOFallar(id)

    const esModerador = quien.claveModeracion === CLAVE_MODERACION
    const esAutor =
      String(comentario.autorEmail).toLowerCase().trim() ===
      String(quien.autorEmail).toLowerCase().trim()

    if (!esModerador && !esAutor) {
      throw new ErrorContratoException({ error: 'No puedes borrar este comentario' }, 403)
    }

    await this.comentarios.borrar(comentario)
  }

  /**
   * Solo edita su autor, mientras siga pendiente. No admite la clave de moderación y
   * compara el correo tal cual, con mayúsculas incluidas (regla distinta a la de `borrar`).
   */
  async paraEditar(id: string, autorEmail: unknown) {
    const comentario = await this.buscarOFallar(id)

    if (comentario.autorEmail !== autorEmail || comentario.estado !== 'pendiente') {
      throw new ErrorContratoException({ error: 'No puedes editar este comentario' }, 403)
    }

    return comentario
  }

  editar(comentario: Comentario, cuerpo: string) {
    return this.comentarios.actualizarCuerpo(comentario, cuerpo)
  }

  private async buscarOFallar(id: string) {
    const comentario = await this.comentarios.buscarPorId(id)
    if (!comentario) {
      throw new ErrorContratoException({ error: 'Comentario no encontrado' }, 404)
    }
    return comentario
  }
}
