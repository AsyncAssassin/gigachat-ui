# Security Policy

## Scope

This is a personal demo project. There is no formal support SLA, but security issues should be reported privately before public disclosure.

## Secrets and Sensitive Data

Do not commit secrets to this repository.

Examples of secrets:
- `GIGACHAT_AUTH_KEY`
- OAuth access tokens
- `Authorization: Basic ...` headers
- `Authorization: Bearer ...` headers
- Private SSH keys and API keys

Use local `.env` files only. Keep only placeholders in `.env.example` files.

Runtime credentials are backend-only. The frontend must call the local proxy and must not receive GigaChat credentials directly.

For corporate TLS interception, use `GIGACHAT_CA_CERT_PATH` with a trusted PEM certificate instead of disabling TLS verification globally.

## Required Local Checks

Before every push, run:

```bash
npm run security:secrets
```

Enable repository hooks once:

```bash
git config core.hooksPath .githooks
```

After that, every commit is checked automatically.

## Incident Response (Secret Leak)

If a secret was exposed:

1. Revoke the leaked credential immediately.
2. Generate a new credential.
3. Replace local values and verify no secret is in tracked files.
4. Run `npm run security:secrets`.
5. If the secret was committed, clean git history and force-push only after team alignment.

## Reporting

Report security issues privately to the repository maintainers.
