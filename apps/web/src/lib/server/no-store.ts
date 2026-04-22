export const NO_STORE_CACHE_CONTROL = "private, no-store";

export function withNoStoreHeaders(headersInit?: HeadersInit): Headers {
  const headers = new Headers(headersInit);
  headers.set("Cache-Control", NO_STORE_CACHE_CONTROL);
  return headers;
}

export function withNoStoreResponseInit(init: ResponseInit = {}): ResponseInit {
  return {
    ...init,
    headers: withNoStoreHeaders(init.headers),
  };
}
