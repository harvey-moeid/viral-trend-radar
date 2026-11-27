import fs from "node:fs";
import path from "node:path";
import { auditLockfile } from "./license-policy.mjs";

const root = process.cwd();
const lockPath = path.join(root, "package-lock.json");
const policyPath = path.join(root, "scripts", "license-policy.json");

let lockfile;
let policy;
try {
  lockfile = JSON.parse(fs.readFileSync(lockPath, "utf8"));
  policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
} catch (error) {
  console.error("License audit configuration could not be read:", error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const result = auditLockfile(lockfile, policy);
console.log("Dependency license policy audit");
console.log("Total dependencies: " + result.total);
console.log("Allowlisted: " + result.allowed.length);
console.log("Explicit review exceptions: " + result.reviews.length);

if (result.reviews.length) {
  console.warn("\nDependencies covered by exact, version-pinned review exceptions:");
  for (const item of result.reviews) {
    console.warn("- " + item.name + "@" + item.version + ": " + item.license +
      " [dev=" + item.devOnly + ", optional=" + item.optional + "] — " + item.reason);
  }
}

if (result.errors.length) {
  console.error("\nLicense policy violations:");
  for (const item of result.errors) {
    console.error("- " + item.name + "@" + item.version + ": " + item.license + " — " + item.reason);
  }
  process.exitCode = 1;
} else {
  console.log("\nPASS: every locked dependency is allowlisted or has an exact review exception.");
}
