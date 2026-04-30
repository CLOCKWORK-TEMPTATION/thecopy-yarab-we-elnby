import type {
  AxiosAdapter,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { AxiosError } from "axios";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RoleGuard } from "../../src/guards/RoleGuard";
import { api, removeToken, storeToken } from "../../src/lib/auth";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

type Handler = (config: AxiosRequestConfig) => {
  status: number;
  data?: unknown;
};

function buildAdapter(routes: Map<string, Handler>): AxiosAdapter {
  return async (config): Promise<AxiosResponse> => {
    const method = (config.method ?? "get").toLowerCase();
    const url = config.url ?? "";
    const handler = routes.get(`${method} ${url}`);
    if (!handler) {
      throw new AxiosError(
        `No mock route for ${method} ${url}`,
        "ERR_MOCK_NOT_FOUND",
        config as InternalAxiosRequestConfig,
      );
    }

    const programmed = handler(config);
    const response: AxiosResponse = {
      data: programmed.data,
      status: programmed.status,
      statusText: programmed.status >= 400 ? "Error" : "OK",
      headers: {},
      config: config as InternalAxiosRequestConfig,
    };

    if (programmed.status >= 400) {
      throw new AxiosError(
        `Request failed with status code ${programmed.status}`,
        String(programmed.status),
        config as InternalAxiosRequestConfig,
        undefined,
        response,
      );
    }

    return response;
  };
}

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.sig`;
}

function makeValidJwt(role: string): string {
  return makeJwt({
    sub: "role-user",
    projectId: "project-role",
    role,
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
  });
}

describe("RoleGuard", () => {
  const originalAdapter = api.defaults.adapter;
  const allowedRoles = ["director", "admin"] as const;

  beforeEach(() => {
    replace.mockReset();
    removeToken();
  });

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
  });

  it("restores a valid refresh session before rendering protected content", async () => {
    const refreshedToken = makeValidJwt("director");
    const routes = new Map<string, Handler>([
      [
        "post /auth/refresh",
        () => ({ status: 200, data: { access_token: refreshedToken } }),
      ],
    ]);
    api.defaults.adapter = buildAdapter(routes);

    render(
      <RoleGuard allowedRoles={allowedRoles}>
        <div>محتوى محمي</div>
      </RoleGuard>,
    );

    await expect(screen.findByText("محتوى محمي")).resolves.toBeVisible();
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects authenticated users who do not have an allowed role", async () => {
    storeToken(makeValidJwt("crew"));

    render(
      <RoleGuard allowedRoles={allowedRoles}>
        <div>محتوى محمي</div>
      </RoleGuard>,
    );

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/BREAKAPP/crew/menu");
    });
    expect(screen.queryByText("محتوى محمي")).not.toBeInTheDocument();
  });
});
