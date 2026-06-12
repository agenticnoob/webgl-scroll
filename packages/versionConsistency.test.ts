import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const repoRoot = process.cwd();

function readPackageJson(path: string) {
  return JSON.parse(readFileSync(join(repoRoot, path, "package.json"), "utf8")) as {
    name: string;
    version: string;
    peerDependencies?: Record<string, string>;
  };
}

describe("workspace package versions", () => {
  test("keeps published packages and peer ranges on the same release line", () => {
    const core = readPackageJson("packages/core");
    const effects = readPackageJson("packages/effects");
    const react = readPackageJson("packages/react");

    expect(core.version).toBe("0.2.0");
    expect(effects.version).toBe(core.version);
    expect(react.version).toBe(core.version);
    expect(effects.peerDependencies?.["@webgl-scroll/core"]).toBe(`^${core.version}`);
    expect(react.peerDependencies?.["@webgl-scroll/core"]).toBe(`^${core.version}`);
  });
});
