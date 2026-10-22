import { Exception } from '@adonisjs/core/exceptions'

/**
 * Error cuyo código y cuerpo son contrato público y se devuelven tal cual, sin pasar por el
 * formato por defecto del framework. `handler.ts` es quien lo convierte en respuesta.
 *
 * Existe porque los endpoints de comentarios responden hoy con formas de error distintas
 * entre sí (`{error}`, `{message}`, `{errores}`, `{ok:false}`) y un refactor no puede
 * unificarlas: eso es cambiar el contrato (H9) y se decide aparte.
 */
export default class ErrorContratoException extends Exception {
  constructor(
    readonly cuerpo: Record<string, unknown>,
    status: number
  ) {
    super('Error con contrato público fijo', { status })
  }
}
