# Security

This repository works with authenticated university systems and may involve sensitive request flows, cookies, PDFs, and captured traffic.

## Please do not report vulnerabilities publicly first

If you discover a security issue, credential leak, unsafe parsing path, or sensitive-data exposure, do not open a public issue with exploit details.

Instead:

1. Share a private report with the maintainer through GitHub security advisories if enabled.
2. If that is not available, contact the maintainer directly and include enough detail to reproduce the problem safely.
3. Avoid sending live passwords, reusable cookies, or raw session captures unless explicitly requested through a secure channel.

## Good reports include

- affected component or path
- impact
- steps to reproduce
- whether real credentials are required
- suggested mitigation if known

## Sensitive artifacts

Never commit:

- credentials
- cookie jars
- HAR exports with live sessions
- downloaded PDFs from personal accounts
- signed URLs

Those files are intentionally ignored and should stay local.
