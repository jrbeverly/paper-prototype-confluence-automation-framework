# Confluence Automation Framework

> [!WARNING]
> **AI-authored:** This change was autonomously planned and implemented by an AI software factory from a human-authored specification, with possible subsequent human review or modification.

> [!WARNING]
> This experiment is effectively abandoned. The generated material is retained primarily as a research artifact.

Infrastructure as Code for Confluence Automation. See [VISION.md](VISION.md) for the full design intent.

```sh
make validate
make build
make demo
```

These validate the templates, build the automation artifacts, and simulate a page event locally. `make deploy` publishes the generated definitions and requires Confluence Cloud credentials.
