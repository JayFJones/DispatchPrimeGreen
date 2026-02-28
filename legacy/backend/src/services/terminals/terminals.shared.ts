// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from '../../client'
import type { Terminal, TerminalData, TerminalPatch, TerminalQuery, TerminalService } from './terminals.class'

export type { Terminal, TerminalData, TerminalPatch, TerminalQuery }

export type TerminalClientService = Pick<
  TerminalService<Params<TerminalQuery>>,
  (typeof terminalMethods)[number]
>

export const terminalPath = 'terminals'

export const terminalMethods: Array<keyof TerminalService> = ['find', 'get', 'create', 'patch', 'remove']

export const terminalClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(terminalPath, connection.service(terminalPath), {
    methods: terminalMethods
  })
}

// Add this service to the client service type index
declare module '../../client' {
  interface ServiceTypes {
    [terminalPath]: TerminalClientService
  }
}
