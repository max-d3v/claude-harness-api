import { queryAgentReadOnly } from "../agent.js";
import { getDiff, getDiffStat } from "../git.js";
import { $ } from "bun";

interface CodeReviewInput {
  project: string;
  originBranch?: string;
  focus?: string;
}

const READ_ONLY_TOOLS = ["Read", "Glob", "Grep"];

const SYSTEM_PROMPT = `You are a senior code reviewer. You have READ-ONLY access — do not attempt to edit any files.

You will receive a git diff. Analyze it for:

1. **Bugs & correctness** — logic errors, off-by-ones, null/undefined risks
2. **Security** — injection, auth gaps, secrets in code, unsafe dependencies
3. **Performance** — unnecessary allocations, N+1 queries, missing caching
4. **Readability** — naming, structure, dead code, missing types
5. **Best practices** — error handling, testing gaps, API design

For each finding:
- Reference the file path and line number from the diff
- Explain what's wrong and why
- Suggest a concrete fix (as a code snippet)

Keep it concise — skip praise, lead with the most impactful findings.
If the diff is clean, say so briefly.`;

export async function codeReview(input: CodeReviewInput) {
  const branch = input.originBranch ?? "main";

  await $`git -C ${input.project} fetch origin ${branch}`.quiet();

  const [diff, stat] = await Promise.all([
    getDiff(input.project, branch),
    getDiffStat(input.project, branch),
  ]);

  if (!diff) {
    return { result: "No changes found against origin/" + branch, sessionId: undefined };
  }

  const focus = input.focus ? `\nFocus area: ${input.focus}` : "";
  const prompt = `Review the following changes against origin/${branch}.${focus}

## Diff stat
\`\`\`
${stat}
\`\`\`

## Full diff
\`\`\`diff
${diff}
\`\`\``;

  return queryAgentReadOnly({
    prompt,
    project: input.project,
    systemPrompt: SYSTEM_PROMPT,
    tools: READ_ONLY_TOOLS,
    model: "claude-sonnet-4-6",
    effort: "high",
    loadProjectSettings: true,
  });
}
