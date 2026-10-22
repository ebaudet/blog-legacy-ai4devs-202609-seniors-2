import app from '@adonisjs/core/services/app'
import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import ErrorContratoException from '#exceptions/error_contrato_exception'

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: unknown, ctx: HttpContext) {
    // Errores con contrato público fijo (404/403 de comentarios, validación incluida).
    if (error instanceof ErrorContratoException) {
      return ctx.response.status(error.status).send(error.cuerpo)
    }

    return super.handle(error, ctx)
  }

  /**
   * The method is used to report error to the logging service or
   * the a third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    // No son fallos: son respuestas con contrato (incluida una con código 200).
    if (error instanceof ErrorContratoException) {
      return
    }

    return super.report(error, ctx)
  }
}
