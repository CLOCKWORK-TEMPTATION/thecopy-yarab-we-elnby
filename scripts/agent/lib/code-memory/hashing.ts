import crypto from "node:crypto";

export function sha256Hex(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

export function shortHash(content: string): string {
  return sha256Hex(content).slice(0, 16);
}

export function qdrantPointId(id: string): string {
  const hex = sha256Hex(id).slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
