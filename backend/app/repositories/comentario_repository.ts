import Comentario from '#models/comentario'
import { DateTime } from 'luxon'

export type DatosNuevoComentario = {
  postId: number
  autorNombre: string
  autorEmail: string
  cuerpo: string
  padreId: unknown
}

export default class ComentarioRepository {
  buscarPorId(id: string) {
    return Comentario.find(id)
  }

  /**
   * Inserta el comentario como pendiente y devuelve la fila.
   *
   * BUG H4 (caracterizado, se corrige aparte): devuelve la ÚLTIMA fila de la tabla, no la
   * que se acaba de insertar. En secuencia es la misma; con dos POST solapados no.
   */
  async crear(datos: DatosNuevoComentario) {
    await Comentario.create({
      postId: datos.postId,
      autorNombre: datos.autorNombre,
      autorEmail: datos.autorEmail,
      cuerpo: datos.cuerpo,
      estado: 'pendiente',
      creadoEn: DateTime.utc(),
      padreId: (datos.padreId ?? null) as number | null,
    })

    return Comentario.query().orderBy('id', 'desc').firstOrFail()
  }

  async actualizarCuerpo(comentario: Comentario, cuerpo: string) {
    comentario.cuerpo = cuerpo
    await comentario.save()
    return comentario
  }

  async borrar(comentario: Comentario) {
    await comentario.delete()
  }
}
