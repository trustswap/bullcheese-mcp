import type { ZodType } from "zod";

export function hexChainId(chainId: number): string {
  return `0x${chainId.toString(16)}`;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  baseUrl: string,
  path: string,
  schema: ZodType<T>,
  init?: RequestInit,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 10_000,
): Promise<T> {
  const url = `${baseUrl.replace(/\/$/, "")}${path}`;
  let response: Response;
  try {
    response = await fetchImpl(url, {
      ...init,
                        signal: init?.signal ?? AbortSignal.timeout(timeoutMs),
      headers: { "Content-Type": "application/json", ...(init?.headers as Record<string, string>) },
    });
  } catch (cause) {
    throw new ApiError(`Network request to ${path} failed`, 0, cause);
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(`Request to ${path} failed with ${response.status}`, response.status, body);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(
      `Response from ${path} did not match the expected shape`,
      response.status,
      parsed.error,
    );
  }
  return parsed.data;
}
