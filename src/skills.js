/**
 * Framework-specific skill templates for LLMs.
 */
const SKILL_TEMPLATES = {
  "Next.js": `
# Next.js Skill Guidelines

- **App Router vs Pages Router**: Check \`src/app\` vs \`src/pages\` to determine the active router.
- **Server Components**: Components in the App Router are Server Components by default. Use \`"use client"\` directive at the top of the file for client-side interactivity.
- **Routing**: Follow file-system based routing (\`page.tsx\`, \`layout.tsx\`, \`route.ts\`).
- **Data Fetching**: Use Server Components for data fetching where possible. Avoid \`useEffect\` for initial data loading unless necessary.
`,
  "React": `
# React Skill Guidelines

- **Functional Components**: Prefer functional components and hooks over class components.
- **State Management**: Use React context for simple state, or external libraries (Zustand, Redux) for complex state.
- **Hooks Rules**: Only call hooks at the top level and only from React functions.
- **Effects**: Clean up effects in \`useEffect\` return statements.
`,
  "Express.js": `
# Express.js Skill Guidelines

- **Routing**: Organize routes using \`express.Router()\`.
- **Middleware**: Keep middleware functions modular. Remember to call \`next()\` or send a response.
- **Error Handling**: Use centralized error handling middleware \`(err, req, res, next)\`.
- **Async/Await**: Wrap async route handlers to catch exceptions and pass them to \`next\`.
`,
  "Node.js": `
# Node.js Skill Guidelines

- **Async I/O**: Prefer asynchronous, non-blocking APIs (e.g., \`fs/promises\`).
- **Streams**: Use streams for processing large amounts of data.
- **Event Loop**: Avoid long-running synchronous operations that block the event loop.
- **Error Handling**: Listen for \`uncaughtException\` and \`unhandledRejection\` at the process level.
`,
  "Python": `
# Python Skill Guidelines

- **PEP 8**: Follow standard PEP 8 style guidelines.
- **Virtual Environments**: Ensure dependencies are installed in an isolated environment (venv, poetry, conda).
- **Type Hints**: Use type hinting (\`typing\`) for better readability and static analysis.
- **Docstrings**: Document modules, classes, and functions using docstrings.
`
};

/**
 * Generates the content for a skill.md file based on the primary framework.
 * @param {string|null} primaryFramework - The detected primary framework.
 * @returns {string} The markdown content for skill.md.
 */
export function generateSkillMd(primaryFramework) {
  if (!primaryFramework || !SKILL_TEMPLATES[primaryFramework]) {
    return `
# General Developer Skill Guidelines

- **Readability**: Write clean, self-documenting code.
- **Modularity**: Break down complex logic into smaller, reusable functions or modules.
- **Testing**: Ensure appropriate unit and integration test coverage.
- **Documentation**: Keep comments and README up to date.
`.trim() + "\n";
  }

  return SKILL_TEMPLATES[primaryFramework].trim() + "\n";
}
