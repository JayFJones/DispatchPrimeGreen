import authentication from '@feathersjs/authentication-client'
import { feathers } from '@feathersjs/feathers'
import socketio from '@feathersjs/socketio-client'
import io from 'socket.io-client'

// Use the same hostname as the frontend, but port 3031 for backend
const getBackendUrl = () => {
  const protocol = window.location.protocol
  const hostname = window.location.hostname
  return `${protocol}//${hostname}:3031`
}

console.log('Connecting to backend at:', getBackendUrl())

const socket = io(getBackendUrl(), {
  transports: ['websocket', 'polling'],
  timeout: 20_000,
  forceNew: true,
})

socket.on('connect', () => {
  console.log('Socket.io connected to backend')
})

socket.on('disconnect', () => {
  console.log('Socket.io disconnected from backend')
})

socket.on('connect_error', error => {
  console.error('Socket.io connection error:', error)
})

socket.on('error', error => {
  console.error('Socket.io error event:', error)
})

// Listen for service errors
socket.on('service-error', error => {
  console.error('FeathersJS service error event:', error)
})

const connection = socketio(socket)

export const feathersClient = feathers()
  .configure(connection)
  .configure(authentication({
    storage: window.localStorage,
  }))

// Manually register the import services that we need with explicit methods
feathersClient.use('import-preview', connection.service('import-preview'), {
  methods: ['create'],
})
feathersClient.use('import-process', connection.service('import-process'), {
  methods: ['create'],
})

// Register dispatched-routes service for dispatch functionality
feathersClient.use('dispatched-routes', connection.service('dispatched-routes'), {
  methods: ['find', 'get', 'create', 'patch', 'remove'],
})

// Register Geotab service with custom methods (including trip data after refactor)
feathersClient.use('geotab', connection.service('geotab'), {
  methods: ['find', 'get', 'create', 'patch', 'remove', 'authenticate', 'getAuthStatus', 'isSessionValid', 'logout', 'testConnection', 'getDevices', 'getRealTimeFleetInfo', 'getMemoryAuthStatus', 'getCachedFleetData', 'getPollingStatus', 'clearMemoryAuth', 'triggerImmediatePoll', 'getFleetDataSmart', 'getTripData', 'clearTripCache', 'getDriverData', 'clearDriverCache', 'getDeviceData', 'clearDeviceCache', 'getGroupData', 'clearGroupCache', 'updateDatabaseGroups'],
})

// Register Fleet Status service with custom methods (trip data methods now delegate to geotab service)
feathersClient.use('fleet-status', connection.service('fleet-status'), {
  methods: ['find', 'get', 'create', 'patch', 'remove', 'bulkCreateFleetSnapshots', 'getLatestFleetStatus', 'getFleetStatusHistory', 'getFleetStatusByTimeRange', 'getAvailableSnapshots', 'getFleetStatusBySnapshot', 'getFleetStatusNearLocation', 'getTripData', 'clearTripCache'],
})

// Register Route Stops service for closest stop lookup
feathersClient.use('route-stops', connection.service('route-stops'), {
  methods: ['find', 'get', 'create', 'patch', 'remove'],
})

// Register Terminals service for terminal locations
feathersClient.use('terminals', connection.service('terminals'), {
  methods: ['find', 'get', 'create', 'patch', 'remove'],
})

export type FeathersClient = typeof feathersClient
