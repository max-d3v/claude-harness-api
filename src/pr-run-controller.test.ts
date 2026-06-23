import { describe, expect, test } from "bun:test";
import {
  beginPullRequestRun,
  isSupersededPullRequestRun,
} from "./pr-run-controller.ts";

describe("beginPullRequestRun", () => {
  test("supersedes older runs only within the same mode", () => {
    const project = `/tmp/pr-run-controller-${Date.now()}-${Math.random()}`;
    const pr = 123;

    const firstReviewController = new AbortController();
    const firstReviewRun = beginPullRequestRun({
      kind: "code-review",
      project,
      pr,
      controller: firstReviewController,
    });

    const executorController = new AbortController();
    const executorRun = beginPullRequestRun({
      kind: "review-executor",
      project,
      pr,
      controller: executorController,
    });

    expect(executorRun.replacedExisting).toBe(false);
    expect(firstReviewController.signal.aborted).toBe(false);

    const secondReviewController = new AbortController();
    const secondReviewRun = beginPullRequestRun({
      kind: "code-review",
      project,
      pr,
      controller: secondReviewController,
    });

    expect(secondReviewRun.replacedExisting).toBe(true);
    expect(secondReviewRun.replacedKind).toBe("code-review");
    expect(firstReviewController.signal.aborted).toBe(true);
    expect(isSupersededPullRequestRun(firstReviewController.signal)).toBe(true);
    expect(executorController.signal.aborted).toBe(false);

    firstReviewRun.finish();
    executorRun.finish();
    secondReviewRun.finish();
  });
});
