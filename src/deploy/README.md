# Deploy

Reads the generated `dist/*.json` artifacts and creates or updates Confluence
Automation rules via the Confluence Cloud REST API.

## Usage

```
node src/deploy [--dist <dir>] [--endpoint-url <url>] [--space-key <key>]
```

Or with Make:

```
make deploy
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `CONFLUENCE_BASE_URL` | yes | e.g. `https://myorg.atlassian.net` |
| `CONFLUENCE_EMAIL` | yes | Atlassian account email |
| `CONFLUENCE_API_TOKEN` | yes | Atlassian API token |
| `CONFLUENCE_SPACE_KEY` | no | Target space (also settable with `--space-key`) |
| `ENDPOINT_URL` | no | Lambda function URL (also settable with `--endpoint-url`) |

The `ENDPOINT_URL` value is substituted for every `${ENDPOINT_URL}` placeholder
found in the generated definitions before the rule is sent to Confluence.
Obtain the URL from Terraform: `terraform -chdir=terraform output -raw function_url`.

## Behaviour

- Discovers all `.json` files in the dist directory (default: `dist/`).
- Looks up existing rules in Confluence by name.
- **Creates** the rule if no rule with that name exists.
- **Updates** the rule in-place if a rule with that name already exists.
- No diffing or drift detection — idempotent name-based upsert only.
