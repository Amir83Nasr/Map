# Security Policy

Report vulnerabilities via [GitHub Issues](https://github.com/Amir83Nasr/Map/issues) (do not open a public issue with exploit details — describe the impact and we will follow up).

- Supported: latest `main` and latest npm tag.
- No secrets in the repo (`.env` is git-ignored). External input (geocode/search) is untrusted and must stay sanitized.
