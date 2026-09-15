import type { Deps } from "../deps.js";
import { ToolError } from "./execute.js";

export interface PinImageInput {
  dataBase64: string;
  contentType: "image/png" | "image/jpeg" | "image/webp";
  name?: string;
}

export interface PinImageResult {
  uri: string;
  cid: string;
  bytes: number;
  contentType: string;
}

export const PIN_MAX_BYTES = 512 * 1024;

export const PIN_MAX_BASE64_LENGTH = Math.ceil(PIN_MAX_BYTES / 3) * 4 + 4;

const BASE64_RE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function decodeStrictBase64(data: string): Buffer {
  if (data.length > PIN_MAX_BASE64_LENGTH) {
    throw new ToolError(
      "invalid_input",
      `dataBase64 is ${data.length} characters; the limit is ${PIN_MAX_BASE64_LENGTH} characters (512 KiB decoded)`,
    );
  }
  if (!BASE64_RE.test(data)) {
    throw new ToolError("invalid_input", "dataBase64 is not valid base64");
  }
  return Buffer.from(data, "base64");
}

const MAGIC_BYTES: Record<PinImageInput["contentType"], (bytes: Buffer) => boolean> = {
  "image/png": (b) =>
    b.length >= 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a,
  "image/jpeg": (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/webp": (b) =>
    b.length >= 12 &&
    b.subarray(0, 4).toString("ascii") === "RIFF" &&
    b.subarray(8, 12).toString("ascii") === "WEBP",
};

function utcDay(nowSeconds: number): string {
  return new Date(nowSeconds * 1000).toISOString().slice(0, 10);
}

export async function pinImage(deps: Deps, input: PinImageInput): Promise<PinImageResult> {
  if (!deps.ipfs) {
    throw new ToolError("invalid_input", "image pinning needs BULLCHEESE_PINATA_JWT");
  }

  const bytes = decodeStrictBase64(input.dataBase64);

  if (bytes.length > PIN_MAX_BYTES) {
    throw new ToolError(
      "invalid_input",
      `image is ${bytes.length} bytes; the limit is ${PIN_MAX_BYTES} bytes (512 KiB)`,
    );
  }

  if (!MAGIC_BYTES[input.contentType](bytes)) {
    throw new ToolError(
      "invalid_input",
      `image bytes do not look like ${input.contentType} (magic-byte check failed)`,
    );
  }

  const today = utcDay(deps.now());
  if (deps.pinsToday.day !== today) {
    deps.pinsToday.day = today;
    deps.pinsToday.count = 0;
  }
          if (deps.pinsToday.count >= deps.pinDailyLimit) {
    throw new ToolError("rate_limited", `pin limit ${deps.pinDailyLimit} reached for today`);
  }

  const uri = await deps.ipfs.pinFile(bytes, {
    name: input.name ?? "image",
    contentType: input.contentType,
  });
  deps.pinsToday.count += 1;

  const cid = uri.replace(/^ipfs:\/\//, "");
  return { uri, cid, bytes: bytes.length, contentType: input.contentType };
}
