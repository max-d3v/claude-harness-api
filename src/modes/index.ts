import { codeReview } from "./code-review.js";

export const MODES = {
  "code-review": codeReview,
} as const;

export type ModeName = keyof typeof MODES;
