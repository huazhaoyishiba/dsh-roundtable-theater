# AI Roundtable Theater

[中文](README.md) | English

A native DeepSeek Harness panel for discussing an idea with a product manager, an engineer and a critical user. Each role speaks in two rounds, then a moderator summarizes agreements, disagreements and next steps.

![Roundtable Theater running inside Harness](assets/screenshot.png)

<details>
<summary>Dark theme</summary>

![Roundtable Theater in the Harness dark theme](assets/screenshot-dark.png)

</details>

## Install

Download a prebuilt package from [GitHub Releases](https://github.com/huazhaoyishiba/dsh-roundtable-theater/releases), or install it directly into the Web profile:

```sh
dsh plugin --profile web add https://github.com/huazhaoyishiba/dsh-roundtable-theater/releases/latest/download/dsh-roundtable-theater.tgz
```

Restart that Harness client, then open **圆桌剧场** in the sidebar. Desktop users can import the same package through their Plugins panel. Desktop and Web profiles maintain separate plugin lists.

The repository includes its built browser entry, so installation from source is also supported:

```sh
dsh plugin --profile web add https://github.com/huazhaoyishiba/dsh-roundtable-theater
```

Minimum Harness version: **0.1.5-rc.1**, with no declared upper bound. Runtime checks have been run against **0.1.5-rc.1** and **0.2.1-rc.3**. The interface currently uses Chinese labels and role prompts.

## Features

- Two ordered rounds with three fixed roles, followed by a moderator summary.
- Streaming answers, pause/resume and targeted follow-up questions.
- Retry an answer while retaining its previous versions in the archive.
- Mark an answer as supported or challenged, then refresh an outdated summary.
- Persistent discussion history and Markdown export.
- An independent native panel that follows the Harness light, dark and custom themes, with responsive layout, keyboard controls and reduced-motion support.

Roles use the same default model configured in Harness, with separate role prompts and explicit discussion context. The plugin does not create independent coding agents or give roles shell, file-editing or external-action tools.

A complete discussion makes seven model requests. Follow-ups, retries and summary refreshes each make another request, billed by the configured provider. Existing Harness model and credential services are reused; the plugin stores no API key.

## Data and configuration

History belongs to the `roundtable_theater` Harness storage domain. By default it retains up to 30 discussions and 80 answers per discussion. Interrupted work resumes in a paused state after a restart. Votes represent one local user's opinion rather than a multi-user tally.

Override the plugin row in the target profile's `cordis.patch.yml` and restart Harness:

```yaml
- id: roundtable-theater
  config:
    maxRuns: 30
    maxTokens: 1800
    timeoutMs: 180000
```

## Development and verification

Node.js 22 or later is required. Install the declared peer dependencies, or link an existing Harness CLI/desktop runtime for local development:

```sh
node scripts/link-dsh.mjs /path/to/harness-runtime
npm test
npm run build
npm pack
```

`scripts/host-smoke.mjs` runs the real Cordis, RPC Gateway and JSON storage with mock model streams. Set `DSH_RUNTIME` to an installed Harness runtime directory before running it. `scripts/native-ui-smoke.mjs` checks the sidebar, browser bundle and RPC state of a running test Harness without starting a model request.

`npm run preview` serves an explicitly labeled offline UI demonstration at `http://127.0.0.1:8765`. Its fixed example responses are for interaction testing and do not represent a live-model test. The test suite and host checks do not establish live-model answer quality.

See [the architecture baseline](docs/architecture.md). This is an independent MIT-licensed plugin using the public [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugin contracts.
