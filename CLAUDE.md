# Project rules

- Reply to the user in Arabic, concisely, with short step-by-step explanations.
- Write all code without comments.
- Static site only: pure HTML + CSS + JavaScript. No backend, no database, no build step, no accounts, no cookies, no analytics.
- Relative URLs only. The site must work when served from a sub-path such as /repo-name/ on GitHub Pages.
- Third-party libraries are pinned and vendored in /vendor. No CDN at runtime.
- Calculation logic lives in /lib as pure ES modules with no DOM access.
- Every tool must have tests (unit tests in /tests with node:test, browser tests with Playwright).
- Never mark work done before all tests pass in one clean full run.
- Never claim something works without running it.
- Never put secrets or personal data in the repo.
- Ask before deleting files, running anything outside the project folder, or pushing.
- Keep commits small and meaningful.
