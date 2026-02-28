import { user } from './users/users'
import { userActivity } from './user-activities/user-activities'
import { importPreview } from './import/import-preview'
import { importProcess } from './import/import-process'
import { admin } from './admin/admin'
import { terminal } from './terminals/terminals'
import { customer } from './customers/customers'
import { driver } from './drivers/drivers'
import { route } from './routes/routes'
import { routeStop } from './route-stops/route-stops'
import { history } from './history/history'
import { availability } from './availability/availability'
import { equipment } from './equipment/equipment'
import { fleet } from './fleet/fleet'
import { fleetStatus } from './fleet-status/fleet-status'
import { geotab } from './geotab/geotab'
import { dispatchedRoute } from './dispatched-routes/dispatched-routes'
import { routeSubstitution } from './route-substitution/route-substitution'
import { routeExecution } from './route-executions/route-executions'
// For more information about this file see https://dove.feathersjs.com/guides/cli/application.html#configure-functions
import type { Application } from '../declarations'

export const services = (app: Application) => {
  app.configure(user)
  app.configure(userActivity)

  app.configure(importPreview)
  app.configure(importProcess)
  app.configure(admin)

  // Core dispatch/routing services
  app.configure(terminal)
  app.configure(customer)
  app.configure(driver)
  app.configure(route)
  app.configure(routeStop)
  app.configure(dispatchedRoute)
  app.configure(routeSubstitution)
  app.configure(routeExecution)
  app.configure(history)
  app.configure(availability)
  app.configure(equipment)
  app.configure(fleet)
  app.configure(fleetStatus)
  app.configure(geotab)
  // All services will be registered here
}
