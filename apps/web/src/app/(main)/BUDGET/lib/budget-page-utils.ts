export const BUDGET_APP_STATE_ID = "BUDGET";

export function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function resolveFilename(response: Response, fallback: string) {
  const contentDisposition = response.headers.get("content-disposition") ?? "";
  const parts = contentDisposition.split("filename=");
  if (parts.length < 2) {
    return fallback;
  }
  return parts[1]?.replaceAll('"', "").trim() ?? fallback;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
