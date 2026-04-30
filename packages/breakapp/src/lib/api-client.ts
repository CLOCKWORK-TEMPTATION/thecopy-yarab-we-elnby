import type { AxiosRequestConfig } from "axios";

import { api } from "./auth";

export async function fetchBreakappJson<T = unknown>(
  path: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await api.get<T>(path, config);
  return response.data;
}

export async function postBreakappJson<T = unknown>(
  path: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await api.post<T>(path, body, config);
  return response.data;
}

export async function patchBreakappJson<T = unknown>(
  path: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await api.patch<T>(path, body, config);
  return response.data;
}
