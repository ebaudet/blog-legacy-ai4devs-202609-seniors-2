import vine, { SimpleErrorReporter, type ValidationError } from '@vinejs/vine'
import type { SimpleError } from '@vinejs/vine/types'
import ErrorContratoException from '#exceptions/error_contrato_exception'

type Contrato = { status: number; cuerpo: Record<string, unknown> }

/**
 * Convierte los errores de VineJS en la respuesta que estos endpoints dan HOY, que no es la
 * de VineJS (422 con `errors[]`). Unificarla es cambiar el contrato (H9): tarea aparte.
 */
class ReporterContrato extends SimpleErrorReporter {
  constructor(private traducir: (errores: SimpleError[]) => Contrato) {
    super()
  }

  createError() {
    const { status, cuerpo } = this.traducir(this.errors)
    // VineJS tipa el retorno como ValidationError, pero lo lanza tal cual: cualquier Error vale.
    return new ErrorContratoException(cuerpo, status) as unknown as ValidationError
  }
}

/** Orden en que el legacy comprobaba los campos: gana el primero que falla. */
const ORDEN_CAMPOS = ['autor_nombre', 'autor_email', 'cuerpo']

function primerFallo(errores: SimpleError[]) {
  return [...errores].sort(
    (a, b) => ORDEN_CAMPOS.indexOf(a.field) - ORDEN_CAMPOS.indexOf(b.field)
  )[0]
}

function traducirCrear(errores: SimpleError[]): Contrato {
  const fallo = primerFallo(errores)

  if (fallo.field === 'autor_nombre') {
    return { status: 400, cuerpo: { error: 'El nombre es obligatorio' } }
  }

  if (fallo.field === 'autor_email') {
    // Ausente o vacío: 422. Presente pero sin arroba (o sin ser texto): 400.
    return ['required', 'minLength'].includes(fallo.rule)
      ? { status: 422, cuerpo: { message: 'Falta el email' } }
      : { status: 400, cuerpo: { errores: ['email no válido'] } }
  }

  // BUG H9: un error que responde 200.
  return { status: 200, cuerpo: { ok: false, motivo: 'comentario demasiado corto' } }
}

function traducirEditar(): Contrato {
  return { status: 400, cuerpo: { error: 'Falta el cuerpo' } }
}

/**
 * POST /posts/:slug/comentarios
 *
 * El correo solo exige llevar una arroba (BUG H8) y `padre_id` no se valida (BUG H7): se
 * conserva tal cual. Los espacios sobrantes los recorta el parser del cuerpo antes de llegar.
 */
export const crearComentarioValidator = vine.create({
  autor_nombre: vine.string().minLength(1),
  autor_email: vine.string().minLength(1).regex(/@/),
  cuerpo: vine.string().minLength(5),
  padre_id: vine.any().optional(),
})
crearComentarioValidator.errorReporter = () => new ReporterContrato(traducirCrear)

/**
 * PATCH /comentarios/:id
 *
 * Solo exige que haya cuerpo: a diferencia del POST, no hay longitud mínima (BUG H11).
 */
export const editarComentarioValidator = vine.create({
  cuerpo: vine.string().minLength(1),
})
editarComentarioValidator.errorReporter = () => new ReporterContrato(traducirEditar)
