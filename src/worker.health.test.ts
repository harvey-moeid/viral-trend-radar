import { describe, expect, it, vi } from "vitest";
import worker from "./worker";

describe("Worker health and same-origin policy", () => {
  it("reports D1 connected only after a successful database probe", async () => {
    const all = vi.fn().mockResolvedValue({results:[{ok:1}]});
    const env = {VTR_DB:{prepare:vi.fn(() => ({all}))}};
    const response = await worker.fetch(new Request("https://worker.test/api/health"), env);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok:true,
      database:true,
      databaseStatus:"connected"
    });
    expect(env.VTR_DB.prepare).toHaveBeenCalledWith("SELECT 1 AS ok");
  });

  it("reports D1 unavailable when the probe fails", async () => {
    const all = vi.fn().mockRejectedValue(new Error("database unavailable"));
    const env = {VTR_DB:{prepare:vi.fn(() => ({all}))}};
    const response = await worker.fetch(new Request("https://worker.test/api/health"), env);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok:true,
      database:false,
      databaseStatus:"unavailable"
    });
  });

  it("distinguishes an unconfigured D1 binding", async () => {
    const response = await worker.fetch(new Request("https://worker.test/api/health"), {});
    expect(await response.json()).toMatchObject({
      database:false,
      databaseStatus:"unconfigured"
    });
  });

  it("does not emit invalid or permissive CORS headers", async () => {
    const response = await worker.fetch(new Request("https://worker.test/api/health"), {});
    expect(response.headers.has("access-control-allow-origin")).toBe(false);
    expect(response.headers.has("access-control-allow-methods")).toBe(false);
    expect(response.headers.has("access-control-allow-headers")).toBe(false);
  });

  it("answers OPTIONS without a body or CORS permission headers", async () => {
    const response = await worker.fetch(new Request("https://worker.test/api/research", {method:"OPTIONS"}), {});
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(response.headers.has("access-control-allow-origin")).toBe(false);
  });
});
