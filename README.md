# ai-i18n

**Automated i18n translation for GitHub workflows, powered by LLMs.**

Translate your app's localization files on every push. Drop in a GitHub Action, point it at your translation files, and get pull-ready translations in seconds — not days.

```yaml
- uses: i18n-actions/ai-i18n@v0.5
  with:
    provider: anthropic
    api-key: ${{ secrets.ANTHROPIC_API_KEY }}
    target-languages: de,fr,es,ja
    files: 'src/locales/**/*.xliff'
```

---

## Why ai-i18n?

| Problem | Solution |
|---|---|
| Translations lag behind development by weeks | Translations ship with the code that needs them |
| Sending files to translators is a manual process | Fully automated — runs on push, commit, or schedule |
| Plural rules differ across languages | CLDR-aware ICU MessageFormat handling for 20+ languages |
| Re-translating unchanged strings wastes money | Content hashing tracks what changed — only new/modified strings hit the API |
| XLIFF inline elements get mangled | Placeholders like `<x id="PH"/>` are extracted, preserved, and reconstructed |

## Supported Formats

| Format | Extensions | Notes |
|--------|------------|-------|
| **XLIFF 1.2** | `.xliff`, `.xlf` | Full inline element preservation (`<x>`, `<ph>`, `<g>`, etc.) |
| **XLIFF 2.0** | `.xliff`, `.xlf` | Segment-level source/target with `<ph>`, `<pc>`, `<sc>`/`<ec>` |
| **JSON (flat)** | `.json` | `"button.save": "Save"` |
| **JSON (nested)** | `.json` | `{ "button": { "save": "Save" } }` |

Format is auto-detected. Override with `format: xliff-1.2` if needed.

## Supported Providers

### Anthropic Claude

```yaml
- uses: i18n-actions/ai-i18n@v0.5
  with:
    provider: anthropic
    api-key: ${{ secrets.ANTHROPIC_API_KEY }}
    model: claude-3-haiku-20240307  # default — fast and cheap
```

### OpenAI

```yaml
- uses: i18n-actions/ai-i18n@v0.5
  with:
    provider: openai
    api-key: ${{ secrets.OPENAI_API_KEY }}
    model: gpt-4o-mini  # default
```

### Ollama (self-hosted)

```yaml
- uses: i18n-actions/ai-i18n@v0.5
  with:
    provider: ollama
    model: llama3.2
    ollama-url: http://localhost:11434
```

No API key required. Run any model you can host.

### AWS Bedrock

Uses the model-agnostic Bedrock Converse API, so any Converse-capable model works — Anthropic Claude, Meta Llama, Amazon Nova/Titan, Mistral, Cohere, and more.

The recommended setup uses [`aws-actions/configure-aws-credentials`](https://github.com/aws-actions/configure-aws-credentials) (OIDC or keys), which populates the standard AWS credential chain — then the action only needs a region:

```yaml
- uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789012:role/bedrock-translate
    aws-region: us-east-1

- uses: i18n-actions/ai-i18n@v0.5
  with:
    provider: bedrock
    aws-region: us-east-1
    model: anthropic.claude-3-haiku-20240307-v1:0  # default
    target-languages: de,fr,es
    files: 'src/locales/**/*.xliff'
```

Or pass credentials explicitly (they fall back to the default AWS credential chain when omitted):

```yaml
- uses: i18n-actions/ai-i18n@v0.5
  with:
    provider: bedrock
    aws-region: us-east-1
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    model: meta.llama3-70b-instruct-v1:0
```

Make sure the target model is enabled in your account's Bedrock **Model access** settings for the chosen region. Some models require a cross-region inference profile ID (e.g. `us.anthropic.claude-...`) rather than the plain foundation-model ID.

---

## Quick Start

### 1. Translate on push to main

```yaml
name: Translate

on:
  push:
    branches: [main]
    paths: ['locales/en/**']

jobs:
  translate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: i18n-actions/ai-i18n@v0.5
        with:
          provider: anthropic
          api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          source-language: en
          target-languages: de,fr,es,ja,ko,zh
          files: 'locales/en/**/*.json'
          format: json-nested
```

### 2. Translate XLIFF files from Angular / iOS / Android

```yaml
- uses: i18n-actions/ai-i18n@v0.5
  with:
    provider: openai
    api-key: ${{ secrets.OPENAI_API_KEY }}
    target-languages: de,fr
    files: 'src/i18n/*.xliff'
```

### 3. Dry run (preview without committing)

```yaml
- uses: i18n-actions/ai-i18n@v0.5
  with:
    provider: anthropic
    api-key: ${{ secrets.ANTHROPIC_API_KEY }}
    target-languages: de
    files: '**/*.xliff'
    dry-run: true
    commit: false
```

---

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `provider` | `anthropic`, `openai`, `ollama`, or `bedrock` | Yes | `anthropic` |
| `api-key` | API key (required for anthropic/openai) | No | — |
| `model` | Model name | No | Provider default |
| `source-language` | Source language code (BCP-47) | Yes | `en` |
| `target-languages` | Comma-separated target codes | Yes | — |
| `files` | Glob pattern for translation files | Yes | `**/*.xliff` |
| `format` | `xliff-1.2`, `xliff-2.0`, `json-flat`, `json-nested`, `auto` | No | `auto` |
| `config-file` | Path to config file | No | `.i18n-translate.yml` |
| `commit` | Commit translated files | No | `true` |
| `commit-message` | Git commit message | No | `chore(i18n): update translations` |
| `batch-size` | Strings per API call | No | `10` |
| `max-retries` | Max retry attempts | No | `3` |
| `ollama-url` | Ollama server URL | No | `http://localhost:11434` |
| `aws-region` | AWS region (required for bedrock) | No | — |
| `aws-access-key-id` | AWS access key ID (bedrock; falls back to default credential chain) | No | — |
| `aws-secret-access-key` | AWS secret access key (bedrock) | No | — |
| `aws-session-token` | AWS session token for temporary credentials (bedrock) | No | — |
| `dry-run` | Preview without writing files | No | `false` |
| `context` | Additional context for the translator | No | — |

## Outputs

| Output | Description |
|--------|-------------|
| `translated-count` | Number of strings translated |
| `files-updated` | Number of files updated |
| `report` | Markdown translation report |
| `commit-sha` | Commit SHA (if committed) |
| `skipped` | Whether the run was skipped |
| `skip-reason` | Why it was skipped |

---

## Configuration File

For projects that need more control, create `.i18n-translate.yml`:

```yaml
provider:
  name: anthropic          # anthropic | openai | ollama | bedrock
  model: claude-3-haiku-20240307
  temperature: 0.3
  # region: us-east-1      # required when name: bedrock

translation:
  batchSize: 15
  maxRetries: 3
  rateLimitPerMinute: 50
  context: "E-commerce mobile app — casual, friendly tone"
  preserveFormatting: true
  preservePlaceholders: true

files:
  pattern: "locales/**/*.json"
  format: json-nested
  sourceLanguage: en
  targetLanguages: [de, fr, es, ja, ko, zh, pt, it]
  exclude: ["**/node_modules/**"]

git:
  enabled: true
  commitMessage: "chore(i18n): update translations"
```

---

## How It Works

```
Source file changed
       |
       v
  Extract units ──> Diff against hash store ──> Only new/modified strings
       |                                                  |
       v                                                  v
  Detect format                                    Batch + translate
  (XLIFF / JSON)                                   (with rate limiting
                                                    and retry logic)
       |                                                  |
       v                                                  v
  Merge translations ──> Write files ──> Update hash store ──> Commit
```

### Change Detection

A `.i18n-hashes.json` file tracks content hashes for every translation unit. On each run, only strings whose source text has changed (or that are brand new) get sent to the API. This keeps costs predictable and runs fast.

### Placeholder Preservation

XLIFF inline elements are extracted with full metadata, sent to the LLM as `{{MARKER}}` tokens, and reconstructed as proper XML in the output:

```
Source XML:    Click <x id="PH"/> to continue
LLM sees:     Click {{PH}} to continue
LLM returns:  Klicken Sie auf {{PH}}, um fortzufahren
Output XML:   Klicken Sie auf <x id="PH"/>, um fortzufahren
```

Supported inline elements: `<x>`, `<ph>`, `<bx>`, `<ex>`, `<bpt>`, `<ept>`, `<g>`, `<pc>`, `<sc>`, `<ec>`, and more.

### ICU Plural Handling

When translating to languages with different plural rules, the action generates the correct categories automatically:

```
English (one/other):
  {count, plural, one {# item} other {# items}}

Russian (one/few/many/other):
  {count, plural, one {# элемент} few {# элемента} many {# элементов} other {# элементов}}

Arabic (zero/one/two/few/many/other):
  {count, plural, zero {لا عناصر} one {عنصر واحد} two {عنصران} few {# عناصر} many {# عنصرًا} other {# عنصر}}
```

Plural rules are sourced from CLDR data for 20+ languages.

### Loop Prevention

The action skips runs triggered by its own commits. You can also add explicit skip markers:

```yaml
commit-message: "chore(i18n): update translations [skip i18n]"
```

---

## Development

```bash
npm install        # install dependencies
npm test           # run tests (236 tests across 18 suites)
npm run build      # compile with ncc
npm run lint       # eslint
npm run format     # prettier
npm run type-check # typescript
```

Requires Node.js 20+.

## License

MIT

