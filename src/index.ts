import * as core from '@actions/core';
import * as github from '@actions/github';
import { generateWithAnthropic } from './providers/anthropic';
import { generateWithOpenAI } from './providers/openai';

const DEFAULT_PROMPT = `You are a senior engineer reviewing a pull request. Based on the diff below, write a clear PR description.

## Instructions
- Write a concise "## Summary" section with 2-4 bullet points explaining WHAT changed and WHY
- Write a "## Changes" section listing the key files and what was modified
- Write a "## Test Plan" section with a checklist of things to verify
- Be specific — reference actual function names, files, and logic
- Do NOT include the diff in your output

## PR Title
{title}

## Diff
\`\`\`
{diff}
\`\`\`

Write the PR description now (markdown format):`;

async function getDiff(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  pullNumber: number,
  maxSize: number
): Promise<string> {
  const { data } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
    mediaType: { format: 'diff' },
  });

  let diff = data as unknown as string;
  if (diff.length > maxSize) {
    diff = diff.substring(0, maxSize) + '\n\n... (diff truncated)';
  }
  return diff;
}

async function run(): Promise<void> {
  try {
    const context = github.context;

    if (!context.payload.pull_request) {
      core.info('Not a pull request event — skipping.');
      return;
    }

    const pullNumber = context.payload.pull_request.number;
    const prTitle = context.payload.pull_request.title;
    const owner = context.repo.owner;
    const repo = context.repo.repo;

    const provider = core.getInput('provider');
    const apiKey = core.getInput('api-key', { required: true });
    const model = core.getInput('model');
    const maxDiffSize = parseInt(core.getInput('max-diff-size'), 10);
    const githubToken = core.getInput('github-token');
    const customTemplate = core.getInput('template');

    const octokit = github.getOctokit(githubToken);

    core.info(`Generating summary for PR #${pullNumber}: ${prTitle}`);

    const diff = await getDiff(octokit, owner, repo, pullNumber, maxDiffSize);

    if (!diff.trim()) {
      core.info('Empty diff — skipping.');
      return;
    }

    const promptTemplate = customTemplate || DEFAULT_PROMPT;
    const prompt = promptTemplate
      .replace('{diff}', diff)
      .replace('{title}', prTitle);

    let summary: string;

    if (provider === 'openai') {
      summary = await generateWithOpenAI(apiKey, model || 'gpt-4o', prompt);
    } else {
      summary = await generateWithAnthropic(
        apiKey,
        model || 'claude-sonnet-4-20250514',
        prompt
      );
    }

    const existingBody = context.payload.pull_request.body || '';
    const marker = '<!-- ai-pr-summary -->';
    const aiSection = `${marker}\n\n${summary}\n\n${marker}`;

    let newBody: string;
    if (existingBody.includes(marker)) {
      const regex = new RegExp(`${marker}[\\s\\S]*${marker}`);
      newBody = existingBody.replace(regex, aiSection);
    } else {
      newBody = existingBody
        ? `${existingBody}\n\n---\n\n${aiSection}`
        : aiSection;
    }

    await octokit.rest.pulls.update({
      owner,
      repo,
      pull_number: pullNumber,
      body: newBody,
    });

    core.setOutput('summary', summary);
    core.info('PR description updated successfully.');
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('An unexpected error occurred');
    }
  }
}

run();
