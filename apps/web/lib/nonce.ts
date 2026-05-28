import { randomBytes } from "node:crypto";

export function buildNonce(): string {
  return randomBytes(18).toString("base64");
}
