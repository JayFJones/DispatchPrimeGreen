// For more information about this file see https://dove.feathersjs.com/guides/cli/client.html
import { feathers } from '@feathersjs/feathers'
import type { TransportConnection, Application } from '@feathersjs/feathers'
import authenticationClient from '@feathersjs/authentication-client'
import type { AuthenticationClientOptions } from '@feathersjs/authentication-client'

import { userClient } from './services/users/users.shared'
export type { User, UserData, UserQuery, UserPatch } from './services/users/users.shared'

import { terminalClient } from './services/terminals/terminals.shared'
export type {
  Terminal,
  TerminalData,
  TerminalQuery,
  TerminalPatch
} from './services/terminals/terminals.shared'

import { customerClient } from './services/customers/customers.shared'
export type {
  Customer,
  CustomerData,
  CustomerQuery,
  CustomerPatch
} from './services/customers/customers.shared'

import { driverClient } from './services/drivers/drivers.shared'
export type {
  Driver,
  DriverData,
  DriverQuery,
  DriverPatch
} from './services/drivers/drivers.shared'

import { routeClient } from './services/routes/routes.shared'
export type { Route, RouteData, RouteQuery, RoutePatch } from './services/routes/routes.shared'

import { routeStopClient } from './services/route-stops/route-stops.shared'
export type {
  RouteStop,
  RouteStopData,
  RouteStopQuery,
  RouteStopPatch
} from './services/route-stops/route-stops.shared'

import { importPreviewClient } from './services/import/import-preview.shared'
export type { ImportPreview, ImportPreviewData } from './services/import/import-preview.shared'

import { importProcessClient } from './services/import/import-process.shared'
export type { ImportProcess, ImportProcessData } from './services/import/import-process.shared'

import { historyClient } from './services/history/history.shared'
export type { History, HistoryData, HistoryQuery, HistoryPatch } from './services/history/history.shared'

import { availabilityClient } from './services/availability/availability.shared'
export type { Availability, AvailabilityData, AvailabilityQuery, AvailabilityPatch } from './services/availability/availability.shared'

import { routeSubstitutionClient } from './services/route-substitution/route-substitution.shared'
export type {
  RouteSubstitution,
  RouteSubstitutionData,
  RouteSubstitutionQuery,
  RouteSubstitutionPatch
} from './services/route-substitution/route-substitution.shared'

import { fleetStatusClient } from './services/fleet-status/fleet-status.shared'
export type {
  FleetStatus,
  FleetStatusData,
  FleetStatusQuery,
  FleetStatusPatch
} from './services/fleet-status/fleet-status.shared'

export interface Configuration {
  connection: TransportConnection<ServiceTypes>
}

export interface ServiceTypes {}

export type ClientApplication = Application<ServiceTypes, Configuration>

/**
 * Returns a typed client for the backend app.
 *
 * @param connection The REST or Socket.io Feathers client connection
 * @param authenticationOptions Additional settings for the authentication client
 * @see https://dove.feathersjs.com/api/client.html
 * @returns The Feathers client application
 */
export const createClient = <Configuration = any>(
  connection: TransportConnection<ServiceTypes>,
  authenticationOptions: Partial<AuthenticationClientOptions> = {}
) => {
  const client: ClientApplication = feathers()

  client.configure(connection)
  client.configure(authenticationClient(authenticationOptions))
  client.set('connection', connection)

  client.configure(userClient)
  client.configure(terminalClient)
  client.configure(customerClient)
  client.configure(driverClient)
  client.configure(routeClient)
  client.configure(routeStopClient)
  client.configure(importPreviewClient)
  client.configure(importProcessClient)
  client.configure(historyClient)
  client.configure(availabilityClient)
  client.configure(routeSubstitutionClient)
  client.configure(fleetStatusClient)
  return client
}
