# Config

Framework configuration files.

Each configuration file selects a template and supplies the parameter values that
specialize it for a specific use case — controlling automation behaviour without
modifying the underlying template.

---

## Format

Configuration files are YAML with the following top-level fields:

```
name          Unique configuration identifier (matches the filename stem)
description   Human-readable purpose

template      Name of the template to instantiate (must match templates/<name>.yaml)
parameters    Values that satisfy the template's declared parameters
```

### parameters

Supply one key per declared template parameter. Required parameters have no
default in the template and must appear here. Optional parameters may be omitted
to accept their defaults.

```yaml
parameters:
  space_key: ENG
  label_filter: rfc
  slack_webhook_url: "${SLACK_WEBHOOK_ENG_DOCS}"
  generate_summary: true
```

Use `${ENV_VAR_NAME}` to reference an environment variable at deployment time.
This is the expected pattern for parameters marked `secret: true` in the
template — values like webhook URLs or API tokens should never be stored as
plain text in configuration files.

---

## Example

See `engineering-docs-notify.yaml` for a complete configuration that instantiates
the `page-created-notify` template for RFC pages in the ENG space.
