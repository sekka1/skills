# Skill authoring best practices

> **Source:** <https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices>
>
> This file is a local copy of Anthropic's official *Skill authoring best practices* guide, kept in this repo so that AI agents working here always have it available. If this file drifts from the upstream version, re-sync it from the URL above.
>
> **All skills in this repository must follow the guidance below.**

---

This guide helps you write effective Skills that Claude can discover and use successfully. Good skills are concise, well-structured, and tested with real usage.

## Core principles

### Concise is key

The context window is a shared public good. It is consumed by the system prompt, conversation history, the metadata of every available Skill, and the user's current request.

- Only the `name` and `description` from each Skill's frontmatter are pre-loaded at startup.
- A Skill's full `SKILL.md` is only loaded when Claude decides the Skill is relevant.
- Once loaded, **every token in `SKILL.md` competes** with conversation history and other context.

Before adding content to `SKILL.md`, ask:

- Does Claude really need this explanation?
- Can I assume Claude already knows this?
- Does this paragraph justify its token cost?

**Assume Claude is already knowledgeable. Only add unique, task-specific context.**

#### Example

❌ **Too verbose** — explains what a PDF is, how to install a library, and generic Python basics.

✅ **Concise** — a short instruction plus a minimal code snippet showing the exact call the skill expects.

### Set appropriate degrees of freedom

Match the specificity of your instructions to how fragile and variable the task is.

| Degree of freedom | When to use | Form the instructions take |
|---|---|---|
| **High freedom** | Tasks with many valid approaches; creative or exploratory work. | Prose guidance and high-level steps. |
| **Medium freedom** | A preferred pattern exists, but parameters vary. | Pseudocode, templated scripts, checklists. |
| **Low freedom** | Fragile, critical, or tightly-scoped processes that must be executed exactly. | Specific scripts or commands with few/no parameters. |

Choose the *least* restrictive option that still makes the task reliable.

## Structure and progressive disclosure

- Start `SKILL.md` with YAML frontmatter (`name`, `description`, and any other required metadata).
- Put the most important instructions near the top.
- **Use progressive disclosure.** Keep `SKILL.md` short. Move large references, long examples, datasets, and scripts into separate files inside the skill folder, and have `SKILL.md` point to them only when they are needed.
- Avoid duplicating generic programming or domain knowledge that Claude already has.

## Writing good `name` and `description` fields

Since `name` and `description` are the *only* parts of a skill that are always in context, they must clearly signal **when** the skill should be invoked.

- `name`: short, kebab-case, specific.
- `description`: one or two sentences describing the situation in which Claude should load this skill. Mention concrete triggers (file types, tools, domains, intents).

## Testing

- Test the skill in realistic conversations, not just the happy path.
- Verify Claude loads the skill when it should, and *doesn't* load it when it shouldn't.
- Iterate: remove anything that didn't end up mattering in real runs.

## Checklist

- [ ] Frontmatter has a clear, specific `name` and `description`.
- [ ] `SKILL.md` contains only context Claude actually needs.
- [ ] Degree of freedom matches the task's fragility.
- [ ] Large/optional content is in auxiliary files, not inline.
- [ ] Skill has been exercised end-to-end with a real agent.

---

*If this local copy is out of date, replace it with the latest content from <https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices>.*
