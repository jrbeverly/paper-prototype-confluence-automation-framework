# Templates

Reusable Confluence Automation rule templates.

Each template defines a parameterized automation pattern — a trigger plus one or
more actions — that the generator expands into a deployable Confluence Automation
definition. See `config/` for how parameters are supplied.

---

## Format

Templates are YAML files with the following top-level fields:

```
name          Unique template identifier (matches the filename stem)
description   Human-readable purpose

parameters    Declared inputs callers must supply
trigger       The Confluence event that activates this automation
actions       Ordered steps executed when the trigger fires
```

### parameters

```yaml
parameters:
  - name: <param_name>        # referenced as {{ param_name }} in trigger/actions
    type: string | boolean
    description: <purpose>
    default: <value>          # omit to make the parameter required
    secret: true              # flag values that must not be logged or stored in plain text
```

### trigger

```yaml
trigger:
  event: <event_name>         # see Event Reference below
  conditions:                 # optional field-level filters
    - field: <context_field>  # dot-path into the Confluence event context
      operator: equals | contains | matches
      value: "{{ param }}"
      skip_when_empty: true   # omit this condition when the resolved value is empty
```

#### Event reference

| event name      | Fires when                              |
| --------------- | --------------------------------------- |
| `page_created`  | A page is created in Confluence         |
| `page_updated`  | A page body or title is edited          |
| `label_applied` | A label is added to a page              |
| `comment_added` | A comment is posted on a page           |

#### Condition context fields

| field                     | Description                              |
| ------------------------- | ---------------------------------------- |
| `space.key`               | Confluence space key                     |
| `page.labels`             | Set of labels on the triggering page     |
| `page.author.accountId`   | Account ID of the page creator           |
| `page.title`              | Page title                               |

### actions

```yaml
actions:
  - name: <step_name>         # unique label for this step
    type: <action_type>       # see Action Reference below
    when: "{{ param }}"       # optional — skip this step when the expression is falsy
    config:                   # type-specific settings; {{ param }} interpolation applies
      ...
```

#### Action reference

| type                 | Purpose                                                   |
| -------------------- | --------------------------------------------------------- |
| `generate_summary`   | Generate an AI summary and store it as a page property    |
| `apply_label`        | Apply a label to the triggering page                      |
| `post_comment`       | Post a comment on the triggering page                     |
| `send_notification`  | Send a notification to Slack or email                     |

#### `generate_summary` config

```yaml
config:
  source: page.content          # content to summarize
  store_as_property: <key>      # page property key for the result
```

#### `apply_label` config

```yaml
config:
  label: <label_name>
```

#### `post_comment` config

```yaml
config:
  body: <markdown text>         # {{ param }} interpolation applies
```

#### `send_notification` config

```yaml
config:
  channel: slack | email
  webhook_url: "{{ param }}"    # Slack incoming webhook URL (channel: slack only)
  to: <address>                 # recipient (channel: email only)
  message: |
    <multi-line message body>   # {{ param }} and Confluence context fields apply
```

---

## Interpolation

Use `{{ name }}` anywhere in `trigger.conditions[].value` or `actions[].config`
to substitute a parameter value at generation time. The same syntax also exposes
Confluence event context fields (e.g. `{{ page.title }}`, `{{ page.url }}`,
`{{ page.author.displayName }}`).

---

## Example

See `page-created-notify.yaml` for a complete template covering a page-creation
trigger, an optional AI summary step, and a Slack notification.
