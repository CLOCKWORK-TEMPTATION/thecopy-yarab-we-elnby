import { Socket } from "node:net";

/**
 * Probe TCP port availability
 */
export function probeTcpPort(
  host: string,
  port: number,
  timeoutMs: number,
): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new Socket();
    let settled = false;

    const finish = (value: boolean) => {
      if (settled) {
        return;
      }

      settled = true;
      socket.destroy();
      resolve(value);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));

    try {
      socket.connect(port, host);
    } catch {
      finish(false);
    }
  });
}

/**
 * Probe HTTP endpoint readiness
 */
export async function probeHttpReady(
  url: string,
  timeoutMs: number,
): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(timeoutMs),
    });
    return response.ok;
  } catch {
    return false;
  }
}
