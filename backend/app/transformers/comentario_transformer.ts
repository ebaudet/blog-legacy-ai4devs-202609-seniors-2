import { BaseTransformer } from '@adonisjs/core/transformers'
import type Comentario from '#models/comentario'

/**
 * Forma pública de un comentario. Las claves van en snake_case porque es el contrato que
 * consume la web hoy; el modelo es camelCase y nunca se devuelve crudo.
 */
export default class ComentarioTransformer extends BaseTransformer<Comentario> {
  toObject() {
    return {
      id: this.resource.id,
      post_id: this.resource.postId,
      autor_nombre: this.resource.autorNombre,
      // BUG H1 (caracterizado, se corrige aparte): el correo de quien comenta sale en la
      // respuesta pública. Corregirlo es quitar esta línea, con su propio test.
      autor_email: this.resource.autorEmail,
      cuerpo: this.resource.cuerpo,
      estado: this.resource.estado,
      creado_en: this.resource.creadoEn?.toFormat('yyyy-MM-dd HH:mm:ss') ?? null,
      padre_id: this.resource.padreId,
    }
  }
}
