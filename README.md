# Riffkit for DSH

The [Riffkit](https://riffkit.ai) agent skill, packaged as an installable
[DSH](https://github.com/deepseek-ai/dsh) bundle.

```bash
dsh plugin add @riffkit/dsh-plugin
```

Change the outfit, place, product or person in your video: Riffkit re-renders
it shot for shot, so your camera, cuts and timing stay. Or turn a winning short
video into yours: Riffkit studies why it worked — the hook, the pacing, the
emotional beats — and makes new footage of that formula with your story, your
product and your character, in any of 10 languages. Or start from a written
idea alone. Whichever you pick, your video is a new render and Riffkit never
re-uploads a source clip. The agent quotes the price before it spends any
credits ([pricing](https://riffkit.ai/pricing)).

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

Then you do not need this package. The skill is a small folder — `SKILL.md`,
`HEARTBEAT.md` and the reference files `SKILL.md` links in `references/` — and
every harness that reads a skills root can load it directly:

```bash
mkdir -p ~/.agents/skills/riffkit/references && cd ~/.agents/skills/riffkit
curl -fsSL https://riffkit.ai/SKILL.md     -o SKILL.md
curl -fsSL https://riffkit.ai/HEARTBEAT.md -o HEARTBEAT.md
for n in details anchor api intents errors install; do
  curl -fsSL "https://riffkit.ai/skill/$n.md" -o "references/$n.md"
done
```

That path — `~/.agents/skills` — is the shared root several harnesses scan, so
one install registers Riffkit in all of them. See
[riffkit/skill](https://github.com/riffkit/skill) for the skill itself, examples,
and the install lines for Claude Code, Cursor and Codex.

## How this stays current

Nothing here is written by hand. A daily workflow pulls `SKILL.md`,
`HEARTBEAT.md`, `SKILL.json` and the reference files `SKILL.json` lists from
riffkit.ai — the single source of truth, served from the app on deploy —
derives `package.json` and `cordis.patch.yml` from them
(`scripts/generate.mjs`), proves the result is still discoverable by DSH's own
provider (`scripts/smoke.mjs`), and publishes any version the registry does not
have yet.

The skill also carries its own 24-hour version heartbeat, so an installed skill
re-syncs itself between package updates.

MIT.
