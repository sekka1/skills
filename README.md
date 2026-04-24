# skills

A collection of [Claude Skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills) authored by [@sekka1](https://github.com/sekka1) for use with AI agents.

## Repository layout

Each folder in the root of this repository is a **single skill**. A skill folder typically contains:

- `SKILL.md` — the skill definition (YAML frontmatter with `name` and `description`, followed by instructions).
- Any supporting scripts, templates, reference docs, or example files the skill loads on demand.

```
skills/
├── AGENTS.md              # Guidance for AI coding agents working in this repo
├── best-practices.md      # Anthropic's official Skill authoring best practices
├── README.md              # You are here
├── <skill-name-1>/
│   └── SKILL.md
├── <skill-name-2>/
│   └── SKILL.md
└── ...
```

## Authoring skills

Before creating or updating any skill in this repo, **read [`best-practices.md`](./best-practices.md)** and follow the guidance in [`AGENTS.md`](./AGENTS.md).

The two core principles from Anthropic's guide:

1. **Concise is key** — every token in `SKILL.md` competes for context. Assume Claude is already knowledgeable; only add unique, task-specific context.
2. **Set appropriate degrees of freedom** — match instruction specificity to the task. Use prose for flexible tasks, pseudocode for templated patterns, and exact scripts for fragile/critical flows.

Use **progressive disclosure**: keep `SKILL.md` small and push large references, datasets, or scripts into separate files that are only loaded when needed.

## Adding a new skill

1. Create a new folder at the repo root named after the skill (kebab-case).
2. Add a `SKILL.md` with YAML frontmatter:
   ```yaml
   ---
   name: my-skill
   description: One-sentence description of when and why to use this skill.
   ---
   ```
3. Follow [`best-practices.md`](./best-practices.md).
4. Test the skill with a real agent before committing.

## License

See repository settings.
