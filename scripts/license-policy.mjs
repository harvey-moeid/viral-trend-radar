function packageNameFromLockPath(lockPath) {
  const segments = lockPath.split("node_modules/").at(-1).split("/");
  return segments[0].startsWith("@") ? segments.slice(0, 2).join("/") : segments[0];
}

function licenseTokens(expression) {
  return expression
    .replace(/[()]/g, " ")
    .split(/\\s+(?:OR|AND)\\s+/i)
    .map((token) => token.trim())
    .filter(Boolean);
}

export function auditLockfile(lockfile, policy) {
  const entries = Object.entries(lockfile.packages ?? {})
    .filter(([lockPath]) => lockPath.startsWith("node_modules/"));
  const allowed = [];
  const reviews = [];
  const errors = [];

  if (entries.length === 0) {
    errors.push("Lockfile tidak memiliki entri dependency node_modules.");
  }

  for (const [lockPath, metadata] of entries) {
    const name = packageNameFromLockPath(lockPath);
    const version = metadata.version ?? "UNKNOWN";
    const license = typeof metadata.license === "string" ? metadata.license.trim() : "";

    if (!license || license === "UNKNOWN" || license === "UNLICENSED") {
      errors.push({name, version, license: license || "MISSING", reason:"Metadata lisensi tidak tersedia."});
      continue;
    }

    const tokens = licenseTokens(license);
    const allAllowed = tokens.length > 0 && tokens.every((token) => policy.allowedLicenses.includes(token));
    if (allAllowed) {
      allowed.push({name, version, license});
      continue;
    }

    const exception = policy.reviewExceptions.find((item) =>
      item.name === name && item.version === version && item.license === license
    );
    if (exception) {
      reviews.push({...exception, devOnly: metadata.dev === true, optional: metadata.optional === true});
      continue;
    }

    errors.push({name, version, license, reason:"Lisensi tidak ada dalam allowlist atau pengecualian yang disetujui."});
  }

  return {total: entries.length, allowed, reviews, errors};
}
