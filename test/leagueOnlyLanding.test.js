import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const landingFiles = [
  "src/components/home/Intro.vue",
  "src/components/home/IntroSections.vue",
];

describe("league-only landing page", () => {
  test.each(landingFiles)("%s avoids public product claims", (file) => {
    const source = readFileSync(file, "utf8");

    expect(source).not.toMatch(/14,?000\+/);
    expect(source).not.toMatch(/50,?000\+/);
    expect(source).not.toContain("Powering");
    expect(source).not.toContain("Unique leagues entered");
    expect(source).not.toContain("Reports generated");
    expect(source).not.toContain("Get started for free");
    expect(source).not.toContain("Community comment");
    expect(source).not.toContain("Sleeper Social Media Team");
    expect(source).not.toContain("Weekly reports");
    expect(source).not.toContain("Generate custom matchup reports");
  });
});
