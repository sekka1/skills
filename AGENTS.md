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
