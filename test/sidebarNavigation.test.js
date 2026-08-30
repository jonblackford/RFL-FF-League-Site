import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("sidebar navigation", () => {
  test("does not show informational or subscription links", () => {
    const source = readFileSync("src/components/layout/AppSidebar.vue", "utf8");

    expect(source).not.toContain("path: '/about'");
    expect(source).not.toContain('path: "/about"');
    expect(source).not.toContain("path: '/changelog'");
    expect(source).not.toContain('path: "/changelog"');
    expect(source).not.toContain("path: '/privacy'");
    expect(source).not.toContain('path: "/privacy"');
    expect(source).not.toContain("path: '/terms'");
    expect(source).not.toContain('path: "/terms"');
    expect(source).not.toContain("path: '/account'");
    expect(source).not.toContain('path: "/account"');
  });
});
