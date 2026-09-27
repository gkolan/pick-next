import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

describe("public/_headers", () => {
  it("allows the inline theme script in index.html by hash", () => {
    const html = readFileSync("index.html", "utf8");
    const inline = html.match(/<script>([\s\S]*?)<\/script>/)[1];
    const hash = createHash("sha256").update(inline).digest("base64");
    expect(readFileSync("public/_headers", "utf8")).toContain(`'sha256-${hash}'`);
  });
});
