# Dependency license policy

## Scope
The audit evaluates every dependency entry in the committed npm v3 lockfile, including transitive, optional, and development packages. It does not rely on whatever happens to be installed in a local `node_modules` directory.

## Default allowlist
The following SPDX identifiers are approved by default:
- MIT
- Apache-2.0
- BSD-2-Clause
- BSD-3-Clause
- ISC
- 0BSD
- CC0-1.0

For compound SPDX expressions using `OR` or `AND`, every identifier must be in the allowlist unless the complete package/version/expression has an explicit review exception.

## Review exceptions
Exceptions are pinned by exact package name, version, and complete license expression in `scripts/license-policy.json`. They are printed on every audit run and must include a reason. Current exceptions cover optional development-toolchain packages carrying LGPL-3.0-or-later and the development browser-compatibility dataset carrying CC-BY-4.0.

These exceptions are not blanket approval for new packages, versions, license expressions, or production dependencies. Any change to an exception tuple fails CI until it is reviewed and updated deliberately.

## Failure behavior
The audit exits non-zero when:
- a dependency has missing, unknown, or unlicensed metadata;
- a license is not allowlisted and has no exact review exception;
- an exception's package name, version, or license expression changes;
- the lockfile contains no dependency entries or cannot be parsed.

CI runs the audit after deterministic `npm ci --ignore-scripts`. Do not resolve a failure by weakening the allowlist or suppressing a package. Review the package's upstream license text and distribution role first.

## Commands
```sh
npm run licenses
npm test
```

This automated policy check is a dependency metadata gate, not legal advice. Before distributing a release, review actual license texts and applicable notice/attribution obligations.
