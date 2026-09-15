import { redactUrls } from "../errors.js";
import { ToolError } from "../services/execute.js";
import type { IpfsPinClient } from "./types.js";

const DEFAULT_BASE_URL = "https://api.pinata.cloud";
const TIMEOUT_MS = 30_000;

interface PinResponse {
  IpfsHash?: unknown;
}

export class PinataClient implements IpfsPinClient {
  private readonly jwt: string;
  private readonly baseUrl: string;

  constructor(opts: { jwt: string; baseUrl?: string }) {
    this.jwt = opts.jwt;
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  }

  async pinFile(bytes: Uint8Array, opts: { name: string; contentType: string }): Promise<string> {
    const form = new FormData();
    form.append("file", new Blob([bytes], { type: opts.contentType }), opts.name);
    form.append("pinataMetadata", JSON.stringify({ name: opts.name }));
    return this.post("/pinning/pinFileToIPFS", form);
  }

  async pinJson(json: unknown, name: string): Promise<string> {
    const body = JSON.stringify({ pinataContent: json, pinataMetadata: { name } });
    return this.post("/pinning/pinJSONToIPFS", body, "application/json");
  }

  private async post(path: string, body: FormData | string, contentType?: string): Promise<string> {
    const url = `${this.baseUrl}${path}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        body,
        headers: {
          Authorization: `Bearer ${this.jwt}`,
          ...(contentType ? { "Content-Type": contentType } : {}),
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (cause) {
                        throw new ToolError(
        "pin_failed",
        `pin request to ${redactUrls(url)} failed: ${redactUrls(String(cause))}`,
      );
    }
    const text = await response.text();
    if (!response.ok) {
      throw new ToolError(
        "pin_failed",
        `pin request to ${redactUrls(url)} failed with status ${response.status}`,
      );
    }
    let parsed: PinResponse;
    try {
      parsed = JSON.parse(text) as PinResponse;
    } catch {
      throw new ToolError("pin_failed", `pin response from ${redactUrls(url)} was not JSON`);
    }
    if (typeof parsed.IpfsHash !== "string" || parsed.IpfsHash.length === 0) {
      throw new ToolError("pin_failed", `pin response from ${redactUrls(url)} carried no IpfsHash`);
    }
    return `ipfs://${parsed.IpfsHash}`;
  }
}
