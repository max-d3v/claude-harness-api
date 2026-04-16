# Claude Harness API

Use your claude subscripion plan + a http wrapper with some logic and predefined resources to make your life easier.

MODES:

Prompt:
Given your prompt, project and origin branch, will create a worktree, apply changes and open a draft PR.

Code review:
Given a PR and project, will analyze PR with my code reviewer prompt and add a comment with the review.

Keep in mind all git actions taken from this API are from the logged in user that is runnning this api.