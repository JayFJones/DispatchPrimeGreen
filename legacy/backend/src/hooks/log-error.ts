// For more information about this file see https://dove.feathersjs.com/guides/cli/log-error.html
import type { HookContext, NextFunction } from '../declarations'
import { logger } from '../logger'

export const logError = async (context: HookContext, next: NextFunction) => {
  try {
    await next()
  } catch (error: any) {
    // Handle authentication errors differently - they're expected and not true errors
    if (error.name === 'NotAuthenticated' || error.className === 'not-authenticated') {
      // Log authentication failures at debug level instead of error level
      logger.debug(`Authentication failed: ${error.message}`)
    } else {
      // Log other errors at error level
      logger.error(error.stack)
    }

    // Log validation errors
    if (error.data) {
      logger.error('Data: %O', error.data)
    }

    throw error
  }
}
