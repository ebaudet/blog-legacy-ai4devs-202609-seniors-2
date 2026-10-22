import Post from '#models/post'

export default class PostRepository {
  /**
   * Un post solo existe de cara al público si está publicado: el borrador se trata
   * como inexistente (regla de negocio 1).
   */
  publicadoPorSlug(slug: string) {
    return Post.query().where('slug', slug).where('estado', 'publicado').first()
  }
}
