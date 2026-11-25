# AI PR Summary

A GitHub Action that automatically generates PR descriptions from your diffs using Claude or GPT. Never write a PR description again.

## Why?

Most PRs have lazy descriptions. Reviewers waste time figuring out what changed. This action reads your diff and writes a structured summary with what changed, why, and how to test it.

## Quick Start

```yaml
# .github/workflows/pr-summary.yml
name: AI PR Summary

on:
  pull_request:
    types: [opened, synchronize]

permissions:
  pull-requests: write

jobs:
  summarize:
    runs-on: ubuntu-latest
    steps:
      - uses: Mansi2221/ai-pr-summary@v1
        with:
          api-key: ${{ secrets.ANTHROPIC_API_KEY }}
```

That's it. Every PR gets an auto-generated description.

## Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `provider` | `anthropic` or `openai` | `anthropic` |
| `api-key` | API key for the provider | **required** |
| `model` | Model to use | `claude-sonnet-4-20250514` |
| `max-diff-size` | Max diff characters sent to model | `12000` |
| `github-token` | Token for updating PR | `${{ github.token }}` |
| `template` | Custom prompt (use `{diff}` and `{title}`) | built-in |

## Using OpenAI

```yaml
- uses: Mansi2221/ai-pr-summary@v1
  with:
    provider: openai
    api-key: ${{ secrets.OPENAI_API_KEY }}
    model: gpt-4o
```

## Custom Template

```yaml
- uses: Mansi2221/ai-pr-summary@v1
  with:
    api-key: ${{ secrets.ANTHROPIC_API_KEY }}
    template: |
      Summarize this PR diff in 3 bullet points.
      Title: {title}
      Diff: {diff}
```

## How It Works

1. Triggered on `pull_request` events (opened or updated)
2. Fetches the PR diff via GitHub API
3. Sends the diff to Claude or GPT with a structured prompt
4. Updates the PR description with the generated summary
5. Preserves any existing description — AI summary is appended

The AI-generated section is wrapped in HTML comments (`<!-- ai-pr-summary -->`) so it updates cleanly on subsequent pushes without duplicating.

## Outputs

| Output | Description |
|--------|-------------|
| `summary` | The generated summary text |

## License

MIT
