# i18n Translate Action

A GitHub Action that automatically translates i18n files using LLM providers (Anthropic Claude, OpenAI GPT, or Ollama).

## Features

- **Multiple LLM Providers**: Support for Anthropic Claude, OpenAI GPT, and local Ollama models
- **Multiple Formats**: XLIFF 1.2, XLIFF 2.0, JSON (flat and nested)
- **ICU Message Format**: Intelligent handling of plurals with CLDR rules for 20+ languages
- **Change Detection**: Only translates new or modified strings using content hashing
- **Rate Limiting**: Built-in rate limiting and retry logic for API calls
- **Batch Processing**: Efficient batching of translation requests
- **Git Integration**: Automatic commits of translated files

## Quick Start

```yaml
name: Translate i18n files

on:
  push:
    branches: [main]
    paths:
      - 'locales/en/**'

jobs:
  translate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Translate
        uses: your-org/i18n-translate-action@v1
        with:
          provider: anthropic
          api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          source-language: en
          target-languages: de,fr,es
          files: 'locales/en/**/*.json'
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `provider` | LLM provider (`anthropic`, `openai`, `ollama`) | Yes | `anthropic` |
| `api-key` | API key for the provider | No* | - |
| `model` | Model to use | No | Provider default |
| `source-language` | Source language code | Yes | `en` |
| `target-languages` | Comma-separated target language codes | Yes | - |
| `files` | Glob pattern for translation files | Yes | `**/*.xliff` |
| `format` | File format (`xliff-1.2`, `xliff-2.0`, `json-flat`, `json-nested`, `auto`) | No | `auto` |
| `config-file` | Path to configuration file | No | `.i18n-translate.yml` |
| `commit` | Whether to commit changes | No | `true` |
| `commit-message` | Commit message | No | `chore(i18n): update translations` |
| `batch-size` | Strings per API call | No | `10` |
| `max-retries` | Maximum retry attempts | No | `3` |
| `ollama-url` | Ollama server URL | No | `http://localhost:11434` |
| `dry-run` | Run without making changes | No | `false` |
| `context` | Additional context for translations | No | - |

*API key is required for Anthropic and OpenAI providers.

## Outputs

| Output | Description |
|--------|-------------|
| `translated-count` | Number of strings translated |
| `files-updated` | Number of files updated |
| `report` | Translation report in markdown |
| `commit-sha` | SHA of the commit (if committed) |

## Configuration File

You can use a `.i18n-translate.yml` file for configuration:

```yaml
provider:
  name: anthropic
  model: claude-3-haiku-20240307
  temperature: 0.3

translation:
  batchSize: 15
  maxRetries: 3
  context: "Mobile app UI translations"
  preserveFormatting: true
  preservePlaceholders: true

git:
  enabled: true
  commitMessage: "chore(i18n): update translations"

files:
  pattern: "locales/**/*.json"
  format: json-nested
  sourceLanguage: en
  targetLanguages:
    - de
    - fr
    - es
    - ja
  exclude:
    - "**/node_modules/**"
```

## Supported File Formats

### XLIFF 1.2

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <file source-language="en" target-language="de">
    <body>
      <trans-unit id="greeting">
        <source>Hello, World!</source>
        <target></target>
      </trans-unit>
    </body>
  </file>
</xliff>
```

### XLIFF 2.0

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xliff version="2.0" srcLang="en" trgLang="de" xmlns="urn:oasis:names:tc:xliff:document:2.0">
  <file id="messages">
    <unit id="greeting">
      <segment>
        <source>Hello, World!</source>
        <target></target>
      </segment>
    </unit>
  </file>
</xliff>
```

### JSON (Flat)

```json
{
  "greeting": "Hello, World!",
  "button.save": "Save"
}
```

### JSON (Nested)

```json
{
  "greeting": "Hello, World!",
  "button": {
    "save": "Save",
    "cancel": "Cancel"
  }
}
```

## ICU Message Format Support

The action intelligently handles ICU MessageFormat patterns, including plurals:

```json
{
  "items_count": "{count, plural, one {# item} other {# items}}"
}
```

When translating to languages with different plural rules (like Russian, Arabic, or Polish), the action automatically generates the correct plural forms based on CLDR rules.

### Supported Plural Rules

- **Simple (one/other)**: English, German, Spanish, etc.
- **Complex (one/few/many/other)**: Russian, Polish, Ukrainian, Czech
- **Full (zero/one/two/few/many/other)**: Arabic
- **None (other only)**: Japanese, Chinese, Korean

## Provider Configuration

### Anthropic Claude

```yaml
- uses: your-org/i18n-translate-action@v1
  with:
    provider: anthropic
    api-key: ${{ secrets.ANTHROPIC_API_KEY }}
    model: claude-3-haiku-20240307  # or claude-3-sonnet, claude-3-opus
```

### OpenAI GPT

```yaml
- uses: your-org/i18n-translate-action@v1
  with:
    provider: openai
    api-key: ${{ secrets.OPENAI_API_KEY }}
    model: gpt-4o-mini  # or gpt-4o, gpt-4-turbo
```

### Ollama (Self-hosted)

```yaml
- uses: your-org/i18n-translate-action@v1
  with:
    provider: ollama
    model: llama3.2
    ollama-url: http://localhost:11434
```

## Preventing Infinite Loops

The action automatically detects and skips runs triggered by its own commits. You can also use skip markers:

```yaml
commit-message: "chore(i18n): update translations [skip i18n]"
```

## Development

### Prerequisites

- Node.js 20.x
- npm

### Setup

```bash
npm install
```

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Lint

```bash
npm run lint
```

## License

MIT
