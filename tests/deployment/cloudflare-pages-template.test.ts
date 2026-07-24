import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const workflowUrl = new URL(
  '../../templates/deployment/cloudflare-pages/cloudflare-pages.yml',
  import.meta.url,
);
const wranglerUrl = new URL(
  '../../templates/deployment/cloudflare-pages/wrangler.jsonc',
  import.meta.url,
);

type WorkflowStep = {
  name?: string;
  uses?: string;
  run?: string;
  with?: Record<string, string>;
};

describe('Cloudflare Pages deployment templates', () => {
  it('parses the workflow and includes the required build and deploy contract', async () => {
    const source = await readFile(workflowUrl, 'utf8');
    const workflow = parse(source) as {
      on: { push: { branches: string[] }; pull_request: unknown };
      permissions: Record<string, string>;
      jobs: { 'build-and-deploy': { env: Record<string, string>; steps: WorkflowStep[] } };
    };
    const job = workflow.jobs['build-and-deploy'];
    const commands = job.steps.flatMap((step) => (step.run ? [step.run] : []));
    const nodeStep = job.steps.find((step) => step.uses === 'actions/setup-node@v4');
    const deployStep = job.steps.find(
      (step) => step.uses === 'cloudflare/wrangler-action@v3',
    );

    expect(workflow.on.push.branches).toEqual(['<PRODUCTION_BRANCH>']);
    expect(workflow.on).toHaveProperty('pull_request');
    expect(workflow.permissions).toEqual({ contents: 'read', deployments: 'write' });
    expect(nodeStep?.with?.['node-version']).toBe('22.12.0');
    expect(commands).toEqual([
      'npm ci',
      'npm run check',
      'npm run test',
      'npm run build',
    ]);
    expect(job.env.BUILD_OUTPUT_DIRECTORY).toContain('vars.BUILD_OUTPUT_DIRECTORY');
    expect(deployStep?.with?.apiToken).toBe('${{ secrets.CLOUDFLARE_API_TOKEN }}');
    expect(deployStep?.with?.accountId).toBe('${{ secrets.CLOUDFLARE_ACCOUNT_ID }}');
    expect(deployStep?.with?.gitHubToken).toBe('${{ secrets.GITHUB_TOKEN }}');
    expect(deployStep?.with?.command).toContain('pages deploy ${{ env.BUILD_OUTPUT_DIRECTORY }}');
    expect(deployStep?.with?.command).toContain(
      '--project-name=${{ vars.CLOUDFLARE_PAGES_PROJECT_NAME }}',
    );
    expect(deployStep?.with?.command).toContain('--branch=${{');
  });

  it('parses the Wrangler template and keeps provider values as placeholders', async () => {
    const source = await readFile(wranglerUrl, 'utf8');
    const config = JSON.parse(source) as Record<string, string>;

    expect(config.name).toBe('<CLOUDFLARE_PAGES_PROJECT_NAME>');
    expect(config.pages_build_output_dir).toBe('<BUILD_OUTPUT_DIRECTORY>');
    expect(source).not.toMatch(/[a-f0-9]{32}/i);
  });

  it('contains references rather than committed Cloudflare credentials', async () => {
    const workflow = await readFile(workflowUrl, 'utf8');
    const wrangler = await readFile(wranglerUrl, 'utf8');
    const combined = `${workflow}\n${wrangler}`;

    expect(combined).toContain('${{ secrets.CLOUDFLARE_API_TOKEN }}');
    expect(combined).toContain('${{ secrets.CLOUDFLARE_ACCOUNT_ID }}');
    expect(combined).toContain('${{ vars.CLOUDFLARE_PAGES_PROJECT_NAME }}');
    expect(combined).not.toContain('catharsiswatari');
    expect(combined).not.toMatch(/Authorization\s*:/i);
  });
});
