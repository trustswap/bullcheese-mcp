export interface IpfsPinClient {
  pinFile(bytes: Uint8Array, opts: { name: string; contentType: string }): Promise<string>;
  pinJson(json: unknown, name: string): Promise<string>;
}
