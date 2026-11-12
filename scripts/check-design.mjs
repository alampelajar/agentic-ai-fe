#!/usr/bin/env node
// Checks new and changed lines against the rules in DESIGN.md.
//
//   node scripts/check-design.mjs                 lines changed on this branch (vs origin/main)
//   node scripts/check-design.mjs --base <ref>    lines changed since <ref>
//   node scripts/check-design.mjs --all [files]   every line (shows what older code still breaks)
//   node scripts/check-design.mjs --hook          for Claude Code: reads the edited file from stdin
//
// Only new lines are checked, so older screens do not fail until someone touches them.
// To allow one line on purpose, add a comment containing "design-system-ignore"
// on that line or the line above it, and say why.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const CONFIG = {
  // Files the rules apply to.
  include: /^src\/.*\.(tsx|ts)$/,
  skip: [/\.test\.tsx?$/, /^src\/routeTree\.gen\.ts$/, /^src\/components\/ui\//],
  // A design editor stores the user's own colors, so hex values are data there.
  hexAllowed: [/^src\/features\/design-studio\//, /^src\/assets\//],
  // Status colors from DESIGN.md, the only palette colors allowed.
  allowedPalette: new Set([
    'text-emerald-600',
    'dark:text-emerald-400',
    'bg-emerald-500/10',
    'text-amber-700',
    'dark:text-amber-400',
    'bg-amber-500/10',
  ]),
  locales: { en: 'src/i18n/locales/en.json', id: 'src/i18n/locales/id.json' },
  // Files whose visible text must come from the language files.
  textFiles: /\.tsx$/,
}

const PALETTE =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'
const COLOR_UTILS =
  'bg|text|border|border-[trblxyse]|ring|ring-offset|from|via|to|fill|stroke|outline|divide|placeholder|decoration|shadow|accent|caret'
const PALETTE_CLASS = new RegExp(
  `(?<![\\w-])((?:[a-z0-9-]+:)*(?:${COLOR_UTILS})-(?:(?:${PALETTE})-\\d{2,3}|white|black)(?:\\/[\\w.[\\]]+)?)(?![\\w-])`,
  'g'
)
const SPACING_UTILS =
  'p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me|gap|gap-x|gap-y|space-x|space-y|w|h|size|min-w|max-w|min-h|max-h|inset|inset-x|inset-y|top|right|bottom|left|start|end|text|leading|tracking|rounded'
const ARBITRARY = new RegExp(`(?<![\\w-])-?(?:[a-z0-9-]+:)*(${SPACING_UTILS})-\\[(?!var\\()[^\\]\\s]+\\]`, 'g')
const HEX = /(?<![\w&/#-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g
const DIALOGS = /(?:\bwindow\.|(?<![\w.]))(confirm|alert|prompt)\(/g
const TEXT_ATTRS = /\b(placeholder|title|aria-label|alt|label|description)=(["'])([^"']*)\2/g
const INLINE_TEXT = /(?<![=-])>([^<>{}=;()&|`]*[A-Za-z]{2}[^<>{}=;()&|`]*)<(?=\/|[A-Za-z{])/g
const TERNARY_TEXT = /\?\s*(['"])([A-Z][^'"]*[a-z][^'"]*)\1\s*:\s*(['"])([A-Z][^'"]*[a-z][^'"]*)\3/g
const TOAST_TEXT =/\btoast(?:\.\w+)?\(\s*(['"`])\s*[A-Za-z]/g
const T_KEY = /(?:\bt|i18n\.t)\(\s*(['"])([\w.-]+)\1|\bi18nKey=(["'])([\w.-]+)\3/g

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
}

function tryGit(args) {
  try {
    return git(args)
  } catch {
    return null
  }
}

function applies(file) {
  return CONFIG.include.test(file) && !CONFIG.skip.some((re) => re.test(file))
}

// Line numbers added or changed in each file since `base` (working tree included).
function changedLines(base, onlyFiles) {
  const result = new Map()
  const diff = tryGit(['diff', '-U0', '--no-color', '--diff-filter=ACMR', base, '--', ...(onlyFiles ?? [])]) ?? ''
  let file = null
  for (const raw of diff.split('\n')) {
    const line = raw.replace(/\r$/, '')
    if (line.startsWith('+++ ')) {
      file = line === '+++ /dev/null' ? null : line.slice(6)
      if (file && !result.has(file)) result.set(file, new Set())
      continue
    }
    const hunk = /^@@ -\S+ \+(\d+)(?:,(\d+))? @@/.exec(line)
    if (hunk && file) {
      const start = Number(hunk[1])
      const count = hunk[2] === undefined ? 1 : Number(hunk[2])
      for (let n = start; n < start + count; n++) result.get(file).add(n)
    }
  }
  const untracked = (tryGit(['ls-files', '--others', '--exclude-standard', '--', ...(onlyFiles ?? [])]) ?? '')
    .split('\n')
    .map((f) => f.trim())
    .filter(Boolean)
  for (const f of untracked) result.set(f, 'all')
  return result
}

function flatten(object, prefix = '', out = new Map()) {
  for (const [key, value] of Object.entries(object)) {
    const full = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object') {
      out.set(full, 'object')
      flatten(value, full, out)
    } else out.set(full, value)
  }
  return out
}

function loadLocales() {
  const locales = {}
  for (const [lang, file] of Object.entries(CONFIG.locales)) {
    const full = path.join(ROOT, file)
    if (!existsSync(full)) return null
    locales[lang] = flatten(JSON.parse(readFileSync(full, 'utf8')))
  }
  return locales
}

function hasKey(map, key) {
  return map.has(key) || map.has(`${key}_one`) || map.has(`${key}_other`)
}

// Both languages must have the same keys, and none of them empty.
function checkLocales(locales, problems) {
  const langs = Object.keys(locales)
  for (const lang of langs) {
    for (const [key, value] of locales[lang]) {
      if (value === 'object') continue
      for (const other of langs) {
        if (other !== lang && !locales[other].has(key)) {
          problems.push({
            file: CONFIG.locales[other],
            line: 0,
            rule: 'i18n-missing',
            message: `"${key}" is in ${lang}.json but missing from ${other}.json`,
          })
        }
      }
      if (typeof value === 'string' && value.trim() === '') {
        problems.push({ file: CONFIG.locales[lang], line: 0, rule: 'i18n-empty', message: `"${key}" is empty` })
      }
    }
  }
}

function ignored(lines, index) {
  return /design-system-ignore/.test(lines[index]) || (index > 0 && /design-system-ignore/.test(lines[index - 1]))
}

function checkFile(file, wanted, locales, problems) {
  const full = path.join(ROOT, file)
  if (!existsSync(full)) return
  checkSource(file, readFileSync(full, 'utf8'), wanted, locales, problems)
}

// `wanted` is 'all' or the set of line numbers to check.
export function checkSource(file, source, wanted, locales, problems) {
  const lines = source.split(/\r?\n/)
  const checkText = Boolean(CONFIG.textFiles?.test(file))
  const report = (line, rule, message) => problems.push({ file, line, rule, message })

  lines.forEach((text, index) => {
    const lineNo = index + 1
    if (wanted !== 'all' && !wanted.has(lineNo)) return
    if (ignored(lines, index)) return
    const code = text.replace(/^\s*(\/\/|\*|\/\*).*$/, '')
    if (!code.trim()) return

    if (!CONFIG.hexAllowed.some((re) => re.test(file))) {
      for (const m of code.matchAll(HEX)) {
        report(lineNo, 'no-hex', `${m[0]}: use a theme color such as bg-primary or text-muted-foreground`)
      }
    }
    for (const m of code.matchAll(PALETTE_CLASS)) {
      if (!CONFIG.allowedPalette.has(m[1]) && !CONFIG.allowedPattern?.test(m[1])) {
        report(lineNo, 'no-palette', `${m[1]}: use a theme color (bg-muted, text-foreground, bg-primary...)`)
      }
    }
    for (const m of code.matchAll(ARBITRARY)) {
      report(lineNo, 'no-arbitrary', `${m[0]}: use the Tailwind scale (for example p-3, text-xs)`)
    }
    for (const m of code.matchAll(DIALOGS)) {
      report(lineNo, 'no-browser-dialog', `${m[1]}(): use ConfirmDialog or a toast instead`)
    }

    if (checkText) {
      for (const m of code.matchAll(TEXT_ATTRS)) {
        // Keys, URLs and e-mail addresses are not interface text.
        // A file path such as src/main.go is an example value too.
        const examplePath = /^[^\s]*\/[^\s]*$/.test(m[3])
        if (/[A-Za-z]{2}/.test(m[3]) && !/^[\w-]+\.[\w.-]+$/.test(m[3]) && !/:\/\/|@/.test(m[3]) && !examplePath) {
          report(lineNo, 'i18n-hardcoded', `${m[1]}="${m[3]}": put the text in en.json and id.json and use t()`)
        }
      }
      for (const m of code.matchAll(INLINE_TEXT)) {
        // A lowercase identifier such as a provider id (openai) is a value, not a sentence.
        if (/^[a-z0-9_-]+$/.test(m[1].trim())) continue
        // `</p> : loading ? <Card` is a ternary between two elements, not text.
        if (/(^|\s)[?:](\s|$)/.test(m[1])) continue
        report(lineNo, 'i18n-hardcoded', `"${m[1].trim()}": put the text in en.json and id.json and use t()`)
      }
      // A line of plain text between JSX tags.
      const trimmed = code.trim()
      const previous = lines.slice(0, index).reverse().find((l) => l.trim())?.trim() ?? ''
      if (
        /^[A-Za-z][^<>{}=;()`"]*$/.test(trimmed) &&
        /\s/.test(trimmed) &&
        !/^[\w$]+\??:\s/.test(trimmed) &&
        previous.endsWith('>') &&
        !previous.endsWith('=>')
      ) {
        report(lineNo, 'i18n-hardcoded', `"${trimmed}": put the text in en.json and id.json and use t()`)
      }
      // Choosing the language in code skips the language files. Codes such as "id" or "true" are values, not text.
      const languageSwitch = /\b(isIndonesian|isEnglish)\s*\?\s*(['"`])(?=[^'"`]*[A-Z\s])/.test(code)
      if (languageSwitch) {
        report(lineNo, 'i18n-hardcoded', 'text picked with isIndonesian ? ... : ...: put both texts in en.json and id.json and use t()')
      }
      // `busy ? 'Saving...' : 'Save'`: words in a ternary are interface text too.
      // Class names and codes are lowercase, so only capitalised words count.
      for (const m of languageSwitch ? [] : code.matchAll(TERNARY_TEXT)) {
        report(lineNo, 'i18n-hardcoded', `"${m[2]}" / "${m[4]}": put the texts in en.json and id.json and use t()`)
      }
      if (TOAST_TEXT.test(code)) {
        report(lineNo, 'i18n-hardcoded', 'toast with fixed text: use toast(t("..."))')
      }
      TOAST_TEXT.lastIndex = 0
    }

    if (locales) {
      for (const m of code.matchAll(T_KEY)) {
        const key = m[2] ?? m[4]
        // 'prefix.' + value is built at runtime, so it cannot be checked here.
        if (key.endsWith('.')) continue
        for (const [lang, map] of Object.entries(locales)) {
          if (!hasKey(map, key)) {
            report(lineNo, 'i18n-missing', `t("${key}") has no text in ${lang}.json`)
          }
        }
      }
    }
  })
}

function readStdin() {
  try {
    return readFileSync(0, 'utf8')
  } catch {
    return ''
  }
}

function main() {
  const args = process.argv.slice(2)
  const hook = args.includes('--hook')
  const all = args.includes('--all')
  const baseIndex = args.indexOf('--base')
  let files = args.filter((a, i) => !a.startsWith('--') && !(baseIndex !== -1 && i === baseIndex + 1))

  let base
  if (hook) {
    const input = readStdin()
    let target = ''
    try {
      target = JSON.parse(input)?.tool_input?.file_path ?? ''
    } catch {
      return 0
    }
    if (!target) return 0
    const relative = path.relative(ROOT, path.resolve(target)).split(path.sep).join('/')
    // Edits in other repositories are not ours to check.
    if (relative.startsWith('..') || path.isAbsolute(relative)) return 0
    if (!applies(relative) && !Object.values(CONFIG.locales).includes(relative)) return 0
    files = [relative]
    base = 'HEAD'
  } else if (baseIndex !== -1) {
    base = args[baseIndex + 1]
  } else if (!all) {
    const mainRef = tryGit(['rev-parse', '--verify', '--quiet', 'origin/main']) ? 'origin/main' : 'main'
    base = (tryGit(['merge-base', mainRef, 'HEAD']) ?? 'HEAD').trim()
  }

  const locales = loadLocales()
  const problems = []
  if (locales) checkLocales(locales, problems)

  let targets
  if (all) {
    const list = files.length ? files : git(['ls-files', 'src']).split('\n').filter(Boolean)
    targets = new Map(list.filter(applies).map((f) => [f, 'all']))
  } else {
    targets = changedLines(base, files.length ? files : undefined)
  }
  for (const [file, wanted] of targets) {
    if (applies(file)) checkFile(file, wanted, locales, problems)
  }

  if (problems.length === 0) {
    if (!hook) console.log(`Design check passed (${targets.size} file(s) checked).`)
    return 0
  }

  const lines = problems.map((p) => `${p.file}${p.line ? `:${p.line}` : ''}  [${p.rule}]  ${p.message}`)
  const summary = `${problems.length} design-system problem(s). See DESIGN.md. To allow a line on purpose, add a "design-system-ignore" comment with the reason.`
  if (hook) {
    process.stderr.write(`${lines.join('\n')}\n${summary}\n`)
    return 2
  }
  console.error(lines.join('\n'))
  console.error(summary)
  return 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main()
}
