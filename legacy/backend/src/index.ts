import { app } from './app'
import { logger } from './logger'
import { seedAdminUser } from './seed'

const port = app.get('port')
const host = app.get('host')

process.on('unhandledRejection', reason => logger.error('Unhandled Rejection %O', reason))

app.listen(port).then(async () => {
  logger.info(`Feathers app listening on http://${host}:${port}`)

  // Seed admin user on startup
  await seedAdminUser(app)
})
