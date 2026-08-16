#!/usr/bin/env node
/**
 * Prove the packaged layout is actually discoverable by DSH — not that it
 * builds, that it WORKS.
 *
 * Two things can silently break here and neither shows up in a build:
 *   1. the `!!js` expression in cordis.patch.yml stops resolving to the skills
 *      dir (a rename, a files[] change, a cordis change to how it evaluates);
 *   2. DSH's discovery contract changes (it is one level deep — <root>/<name>/
 *      SKILL.md — and package manifests are ignored, so a nested move breaks it).
 *
 * So this packs the tarball, installs it into a throwaway project the way a
 * user would, evaluates the patch expression the way cordis does, and runs
 * DSH's own FileSystemSkillProvider against the result.
 *
 * Constructor shape is load-bearing and undocumented: `(ctx, control, config)`,
 * where ctx must answer `get()` and control must carry `invalidate` + `signal`.
 * Calling it any other way throws inside the provider, not in our code.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim()

const fail = (msg) => { console.error(`SMOKE FAIL — ${msg}`); process.exit(1) }

// 1. Pack exactly what would be published.
const tarball = join(ROOT, run('npm', ['pack', '--silent'], ROOT).split('\n').pop())
if (!existsSync(tarball)) fail(`npm pack produced no tarball at ${tarball}`)

// 2. Install it the way a user's project would.
const sandbox = mkdtempSync(join(tmpdir(), 'riffkit-dsh-smoke-'))
run('npm', ['init', '-y'], sandbox)
run('npm', ['i', tarball, '--silent'], sandbox)
run('npm', ['i', '@deepseek-ai/dsh-skill-filesystem', '--silent'], sandbox)

const pkgName = JSON.parse(run('cat', [join(ROOT, 'package.json')])).name
const installed = join(sandbox, 'node_modules', ...pkgName.split('/'))
if (!existsSync(join(installed, 'cordis.patch.yml'))) fail('installed package has no cordis.patch.yml')

// 3. Evaluate the patch's !!js expression the way cordis does: inside
//    `with (ctx)`, where baseUrl is the patch file's directory URL.
const patch = run('cat', [join(installed, 'cordis.patch.yml')])
const expr = patch.match(/!!js "(.+)"\s*$/m)?.[1]
if (!expr) fail('no !!js expression found in cordis.patch.yml')
const evaluate = new Function('ctx', 'expr', 'with (ctx) { return eval(expr) }')
const baseUrl = new URL('.', pathToFileURL(join(installed, 'cordis.patch.yml'))).href
let skillsDir
try {
  skillsDir = evaluate({ baseUrl }, expr.replace(/\\"/g, '"'))
} catch (err) {
  fail(`the patch expression threw: ${err.message}`)
}
if (!existsSync(skillsDir)) fail(`patch resolves to a directory that does not exist: ${skillsDir}`)

// 4. Let DSH's own provider discover it.
const { FileSystemSkillProvider } = await import(
  pathToFileURL(join(sandbox, 'node_modules/@deepseek-ai/dsh-skill-filesystem/lib/index.js')).href
)
const ctx = { get: () => undefined, on() {}, effect() {}, logger: () => ({ warn() {}, debug() {}, info() {} }) }
const control = { invalidate() {}, signal: new AbortController().signal }
const provider = new FileSystemSkillProvider(ctx, control, {
  providerName: 'riffkit-bundle',
  includeDefaultRoots: false,
  watch: false,
  customSkillDirs: [skillsDir],
})

const listed = await provider.list({ cwd: sandbox })
const candidates = listed.candidates ?? listed.items ?? listed
const riffkit = candidates.find((c) => c.name === 'riffkit')
if (!riffkit) fail(`provider found ${candidates.length} skill(s), none named riffkit: ${readdirSync(skillsDir)}`)

const loaded = await provider.get(riffkit, { cwd: sandbox })
const body = loaded?.content ?? loaded?.body ?? loaded?.text ?? ''
if (body.length < 10_000) fail(`skill body loaded but is implausibly short (${body.length} chars)`)

console.log(`SMOKE OK — discovered "${riffkit.name}" from the installed package, ${body.length} chars of body`)
