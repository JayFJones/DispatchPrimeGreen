declare module 'feathers-blob' {
  import { ServiceInterface } from '@feathersjs/feathers'

  interface BlobOptions {
    Model: any
  }

  export default function blobService(options: BlobOptions): ServiceInterface<any>
}
