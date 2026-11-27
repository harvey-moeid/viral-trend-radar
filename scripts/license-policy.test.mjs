import { describe, expect, it } from "vitest";
import { auditLockfile } from "./license-policy.mjs";

const policy = {
  allowedLicenses: ["MIT", "Apache-2.0", "ISC"],
  reviewExceptions: [
    {name:"legacy-tool",version:"1.2.3",license:"LGPL-3.0-or-later",reason:"Reviewed dev-only exception"}
  ]
};

describe("dependency license policy", () => {
  it("accepts explicitly allowlisted licenses, including OR expressions", () => {
    const result = auditLockfile({packages:{
      "node_modules/a":{version:"1.0.0",license:"MIT"},
      "node_modules/b":{version:"2.0.0",license:"MIT OR Apache-2.0"}
    }},policy);
    expect(result.errors).toHaveLength(0);
    expect(result.allowed).toHaveLength(2);
  });

  it("records exact package/version/license exceptions for review", () => {
    const result = auditLockfile({packages:{
      "node_modules/legacy-tool":{version:"1.2.3",license:"LGPL-3.0-or-later",dev:true}
    }},policy);
    expect(result.errors).toHaveLength(0);
    expect(result.reviews).toHaveLength(1);
    expect(result.reviews[0].devOnly).toBe(true);
  });

  it("fails for a new, unapproved license", () => {
    const result = auditLockfile({packages:{
      "node_modules/new-package":{version:"1.0.0",license:"GPL-3.0-only"}
    }},policy);
    expect(result.errors).toHaveLength(1);
  });

  it("fails when license metadata is missing", () => {
    const result = auditLockfile({packages:{
      "node_modules/no-license":{version:"1.0.0"}
    }},policy);
    expect(result.errors[0].license).toBe("MISSING");
  });

  it("does not silently accept a changed exception version", () => {
    const result = auditLockfile({packages:{
      "node_modules/legacy-tool":{version:"1.2.4",license:"LGPL-3.0-or-later",dev:true}
    }},policy);
    expect(result.errors).toHaveLength(1);
  });
});
