# AGENTS.md

Guidance for AI coding agents (Claude Code, Copilot, etc.) working in this repository.

## Purpose of this repo

This repository stores **Claude Skills** that @sekka1 uses with AI agents. Each top-level folder is one skill and should contain a `SKILL.md` (plus any supporting files).

## ⚠️ Required reading before creating or updating any skill

**You MUST read and adhere to [`best-practices.md`](./best-practices.md) before creating a new skill or modifying an existing one.**

That file is Anthropic's official *Skill authoring best practices* guide (source: <https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices>). Every change you make to a skill in this repo — new skill folders, edits to `SKILL.md`, supporting scripts, or reference docs — must follow the principles described there.

At minimum, this means:

- **Be concise.** Do not pad `SKILL.md` with generic explanations Claude already knows. Every token must earn its place.
- **Choose the right degree of freedom.** Use prose for flexible tasks, pseudocode/templates for patterned tasks, and exact scripts for fragile/critical flows.
- **Use progressive disclosure.** Keep `SKILL.md` short; move long references, large examples, and scripts into separate files that the skill loads only when needed.
- **Include proper frontmatter.** `SKILL.md` must start with YAML frontmatter containing at least `name` and a discoverable `description`.
- **Test with realistic scenarios** before committing.

If anything in this `AGENTS.md` conflicts with `best-practices.md`, **`best-practices.md` wins**.

## Repository conventions

- **One skill per top-level folder.** Folder name = skill name (kebab-case, matches the `name` in frontmatter).
- **`SKILL.md` is the entry point** for every skill. Do not rename it.
- **Supporting files** (scripts, templates, data, extended docs) live inside the same skill folder. Reference them from `SKILL.md` with relative paths.
- **No cross-skill imports.** Skills should be self-contained so they can be copied/used independently.
- **Do not edit `best-practices.md`** except to sync it with the upstream Anthropic source.

## Workflow for agents

1. Read [`best-practices.md`](./best-practices.md).
2. Read this `AGENTS.md`.
3. If modifying an existing skill, read its current `SKILL.md` fully before changing anything.
4. Make the smallest change that satisfies the request.
5. Keep `SKILL.md` lean; push bulk content into auxiliary files in the same folder.
6. Verify YAML frontmatter is valid and the `description` clearly signals when the skill should be invoked.

## Out of scope

- Non-skill code, shared libraries, or monorepo infrastructure. This repo is intentionally a flat collection of independent skills.

## Best Practices for Software Development

When working on skills with code (TypeScript, Python, etc.), follow these development best practices:

### Testing

- **Always write unit tests** for any non-trivial piece of code
- **Unit tests** validate individual functions and modules in isolation (fast, no external dependencies)
- **Integration tests** validate end-to-end workflows against real systems (slower, but catch real-world issues)
- Integration tests are very valuable for skills that interact with external services or websites
- Run tests locally before committing to ensure they pass

### Code Quality

- **Always run lint and tests before committing** to a branch or PR
- Fix any linting errors immediately - don't commit code with lint failures
- Use TypeScript strict mode or Python type hints to catch errors early
- Keep functions small and focused on a single responsibility

### Documentation

- **Document code inline** with comments explaining complex logic, edge cases, and intent
- Comments should explain *why*, not *what* (the code shows what)
- **Create separate documentation files** (README.md, knowledge-base.md) for:
  - How to use the skill
  - Known edge cases and workarounds
  - Findings from debugging sessions
  - Architecture decisions and their rationale
- Documentation helps both AI agents and humans understand:
  - What the code does
  - The *intent* behind implementation choices
  - How to debug when things break
  - How to safely refactor

### Commit Discipline

- Run `npm run lint` (or equivalent) before every commit
- Run unit tests before every commit
- Run integration tests when changing critical flows
- Write clear commit messages explaining what changed and why
- Keep commits small and focused on one logical change

### Debugging

- Add detailed logging for complex operations
- Take screenshots during browser automation to debug visual state
- Document findings in knowledge-base.md or similar files
- When debugging fails, document what you tried and why it didn't work

### Why This Matters

Good development practices prevent bugs, make code maintainable, and help future developers (AI and human) understand the codebase. When things break, good documentation and tests make fixes faster and safer.

