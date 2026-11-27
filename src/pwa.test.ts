import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const publicDir = resolve(process.cwd(), "public");
const readPublic = (file: string) =>
  readFileSync(resolve(publicDir, file), "utf8");

describe("PWA app shell", () => {
  it("declares valid standard and maskable icons in the manifest", () => {
    const manifest = JSON.parse(readPublic("manifest.webmanifest"));
    expect(manifest.id).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("standalone");

    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({
        src: "/icon.svg",
        type: "image/svg+xml",
        purpose: "any"
      }),
      expect.objectContaining({
        src: "/icon-maskable.svg",
        type: "image/svg+xml",
        purpose: "maskable"
      })
    ]));

    for (const icon of manifest.icons) {
      expect(icon.sizes).toBe("any");
      expect(readPublic(icon.src.replace(/^\//, ""))).toContain("<svg");
    }
  });

  it("keeps maskable artwork inside a square SVG viewBox", () => {
    const icon = readPublic("icon-maskable.svg");
    expect(icon).toContain('viewBox="0 0 512 512"');
    expect(icon).toContain('<rect width="512" height="512"');
  });

  it("links the manifest and SVG favicon from the document head", () => {
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
    expect(html).toContain('rel="manifest" href="/manifest.webmanifest"');
    expect(html).toContain('rel="icon" href="/icon.svg"');
  });

  it("caches app-shell icons without deleting unrelated origin caches", () => {
    const worker = readPublic("sw.js");
    expect(worker).toContain('"/icon-maskable.svg"');
    expect(worker).toContain('key.startsWith("vtr-shell-")');
    expect(worker).toContain('url.pathname.startsWith("/api/")');
  });
});
