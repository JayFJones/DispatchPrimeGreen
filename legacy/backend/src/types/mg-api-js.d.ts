declare module 'mg-api-js' {
  interface GeotabCredentials {
    sessionId: string
    database: string
    userName: string
  }

  interface GeotabSession {
    credentials: GeotabCredentials
    path: string
  }

  interface GeotabError {
    name: string
    message: string
  }

  interface GeotabResult {
    error?: GeotabError
    [key: string]: any
  }

  interface GeotabAPI {
    authenticate(userName: string, password: string, database: string): Promise<GeotabSession>
    call(method: string, params: any, credentials: GeotabCredentials, server: string): Promise<GeotabResult>
    multiCall(calls: Array<[string, any]>, credentials: GeotabCredentials, server: string): Promise<GeotabResult[]>
  }

  const api: GeotabAPI
  export default api
}