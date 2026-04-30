import { describe, expect, it } from "vitest";

import {
  canAccessPath,
  getDefaultRedirect,
  isValidRole,
} from "../../src/lib/roles";

describe("breakapp role permissions", () => {
  it("keeps admin access broad while blocking crew from admin pages", () => {
    expect(canAccessPath("admin", "/BREAKAPP/director/orders-live")).toBe(true);
    expect(canAccessPath("crew", "/BREAKAPP/admin/users")).toBe(false);
  });

  it("rejects unknown roles and resolves safe default destinations", () => {
    expect(isValidRole("member")).toBe(false);
    expect(getDefaultRedirect("director")).toBe("/BREAKAPP/director");
    expect(getDefaultRedirect("vendor")).toBe("/BREAKAPP/vendor/dashboard");
  });
});
