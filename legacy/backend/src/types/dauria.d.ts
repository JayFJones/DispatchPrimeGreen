declare module 'dauria' {
  export function parseDataURI(dataURI: string): { buffer: Buffer; MIME: string }
  export function getBase64DataURI(buffer: Buffer, mimeType: string): string
}
