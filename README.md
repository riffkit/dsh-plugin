# Riffkit for DSH

The [Riffkit](https://riffkit.ai) agent skill, packaged as an installable
[DSH](https://github.com/deepseek-ai/dsh) bundle.

```bash
dsh plugin add @riffkit/dsh-plugin
```

Riff a winning short video into your own: Riffkit studies why a video worked —
the hook, the pacing, the emotional beats — and rebuilds that formula as new
footage with your product, your character and your language. The source clip is
never re-uploaded; what carries over is the structure, not a single frame.

## What this package is

A packaging layer, nothing more. It ships one thing — the skill — and registers
its own directory as an additional skill root through `cordis.patch.yml`:

```yaml
- insert:
    - id: riffkit-skill-root
      name: '@deepseek-ai/dsh-skill-filesystem'
      config:
        providerName: riffkit-bundle
        includeDefaultRoots: false
        customSkillDirs: [ … the skills/ dir inside this package … ]
```

It **inserts** its own provider row rather than editing the base one, because a
patch replaces a targeted row's whole config instead of merging into it —
overriding would wipe whatever you had configured there. With
`includeDefaultRoots: false` this provider sees exactly one root: its own. It
cannot shadow your skills, and yours cannot shadow it.

## Not using DSH?

Then you do not need this package. The skill is a single Markdown file and every
harness that reads a skills root can load it directly:

```bash
mkdir -p ~/.agents/skills/riffkit
curl -sSL https://riffkit.ai/SKILL.md -o ~/.agents/skills/riffkit/SKILL.md
```

That path — `~/.agents/skills` — is the shared root several harnesses scan, so
one copy registers Riffkit in all of them. See
[riffkit/skill](https://github.com/riffkit/skill) for the skill itself, examples,
and the install lines for Claude Code, Cursor and Codex.

## How this stays current

Nothing here is written by hand. A daily workflow pulls `SKILL.md`,
`HEARTBEAT.md` and `SKILL.json` from riffkit.ai — the single source of truth,
served from the app on deploy — derives `package.json` and `cordis.patch.yml`
from them (`scripts/generate.mjs`), proves the result is still discoverable by
DSH's own provider (`scripts/smoke.mjs`), and publishes any version the registry
does not have yet.

The skill also carries its own 24-hour version heartbeat, so an installed copy
re-syncs itself between package updates.

MIT.
