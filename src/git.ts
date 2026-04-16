import { $ } from "bun";
import { randomBytes } from "crypto";
import path from "path";
import { rm } from "fs/promises";

export interface WorktreeContext {
  worktreePath: string;
  branch: string;
  originBranch: string;
  project: string;
  cleanup: () => Promise<void>;
}

export async function createWorktree(
  project: string,
  originBranch: string,
  branchPrefix = "agent",
): Promise<WorktreeContext> {
  const id = randomBytes(4).toString("hex");
  const branch = `${branchPrefix}/${originBranch}-${id}`;
  const worktreePath = path.join(project, ".worktrees", branch.replace(/\//g, "-"));

  await $`git -C ${project} fetch origin ${originBranch}`.quiet();
  await $`git -C ${project} worktree add -b ${branch} ${worktreePath} origin/${originBranch}`.quiet();

  const cleanup = async () => {
    try {
      await $`git -C ${project} worktree remove --force ${worktreePath}`.quiet();
    } catch {
      await rm(worktreePath, { recursive: true, force: true });
      await $`git -C ${project} worktree prune`.quiet();
    }
    try {
      await $`git -C ${project} branch -D ${branch}`.quiet();
    } catch {}
  };

  return { worktreePath, branch, originBranch, project, cleanup };
}

export async function commitAndPush(ctx: WorktreeContext, message: string): Promise<void> {
  const cwd = ctx.worktreePath;
  const status = await $`git -C ${cwd} status --porcelain`.text();
  if (!status.trim()) return;

  await $`git -C ${cwd} add -A`.quiet();
  await $`git -C ${cwd} commit -m ${message}`.quiet();
  await $`git -C ${cwd} push -u origin ${ctx.branch}`.quiet();
}

export async function openPR(
  ctx: WorktreeContext,
  title: string,
  body: string,
): Promise<string> {
  const result = await $`gh pr create \
    --repo ${ctx.project} \
    --head ${ctx.branch} \
    --base ${ctx.originBranch} \
    --title ${title} \
    --body ${body}`.cwd(ctx.worktreePath).text();
  return result.trim();
}

export async function getDiff(project: string, originBranch: string): Promise<string> {
  const diff = await $`git -C ${project} diff origin/${originBranch}`.text();
  return diff.trim();
}

export async function getDiffStat(project: string, originBranch: string): Promise<string> {
  const stat = await $`git -C ${project} diff --stat origin/${originBranch}`.text();
  return stat.trim();
}
