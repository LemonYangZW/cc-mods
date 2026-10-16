#!/usr/bin/env node
// 通过 Claude Code 自带的 `claude plugin` 命令安装、更新、卸载 cc-mods 里的 mod
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SOURCE = 'LemonYangZW/cc-mods'
const SCOPES = ['user', 'project', 'local']
const MOD_NAME = /^[a-z0-9][a-z0-9-]*$/

const marketplace = JSON.parse(readFileSync(new URL('../.claude-plugin/marketplace.json', import.meta.url), 'utf8'))
const MARKETPLACE = marketplace.name
const MODS = marketplace.plugins

const HELP = `Usage: npx cc-mods <command> [mod...] [--scope user|project|local]

Commands:
  list                List the mods and where they are installed
  install <mod...>    Install mods, adding the ${MARKETPLACE} marketplace if needed
  update [mod...]     Update mods to their latest version (default: every one installed in the scope)
  uninstall <mod...>  Uninstall mods; the marketplace is removed once no ${MARKETPLACE} mod is left

Options:
  -s, --scope <scope>  user (default), project or local
  -h, --help           Show this help

Mods: ${MODS.map(mod => mod.name).join(', ')}`

function fail(message) {
  console.error(`cc-mods: ${message}`)
  process.exit(1)
}

function parse(argv) {
  const mods = []
  let command
  let scope = 'user'
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '-h' || arg === '--help') return { command: 'help', mods, scope }
    if (arg === '-s' || arg === '--scope') scope = argv[++i]
    else if (arg.startsWith('--scope=')) scope = arg.slice('--scope='.length)
    else if (command === undefined) command = arg
    else mods.push(arg)
  }
  return { command: command ?? 'help', mods, scope }
}

// 参数都先过白名单（mod 名、scope），可以安全地拼成一条命令交给 shell；走 shell 是为了在 Windows 上 claude.exe 与 claude.cmd 都能找到
function claude(args, capture = false) {
  const result = spawnSync(['claude', ...args].join(' '), {
    shell: true,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  })
  return { isOk: result.status === 0, stdout: result.stdout ?? '' }
}

function run(args) {
  console.log(`> claude ${args.join(' ')}`)
  if (!claude(args).isOk) process.exit(1)
}

function readJson(args) {
  const { isOk, stdout } = claude(args, true)
  if (!isOk) fail(`\`claude ${args.join(' ')}\` failed`)
  return JSON.parse(stdout)
}

// 各作用域的安装记录，只取本 marketplace 的；project / local 作用域的记录带 projectPath
const installed = () => readJson(['plugin', 'list', '--json']).filter(entry => entry.id.endsWith(`@${MARKETPLACE}`))

const modOf = entry => entry.id.slice(0, -`@${MARKETPLACE}`.length)

const samePath = (a, b) =>
  process.platform === 'win32' ? resolve(a).toLowerCase() === resolve(b).toLowerCase() : resolve(a) === resolve(b)

const isInScope = (entry, scope) =>
  entry.scope === scope && (scope === 'user' || (entry.projectPath !== undefined && samePath(entry.projectPath, process.cwd())))

function list() {
  const entries = installed()
  for (const mod of MODS) {
    const where = entries
      .filter(entry => modOf(entry) === mod.name)
      .map(entry => (entry.scope === 'user' ? 'user' : `${entry.scope}: ${entry.projectPath}`))
    console.log(`${mod.name}${where.length > 0 ? `  (installed: ${where.join('; ')})` : ''}`)
    console.log(`  ${mod.description}`)
  }
}

function install(mods, scope) {
  if (mods.length === 0) fail(`name the mods to install: ${MODS.map(mod => mod.name).join(', ')}`)
  const unknown = mods.filter(mod => !MODS.some(known => known.name === mod))
  if (unknown.length > 0) fail(`unknown mod: ${unknown.join(', ')}. Available: ${MODS.map(mod => mod.name).join(', ')}`)
  for (const mod of mods) run(['plugin', 'install', mod, '--marketplace', SOURCE, '--scope', scope])
  console.log('Done. New Claude Code sessions load the installed mods.')
}

function update(mods, scope) {
  run(['plugin', 'marketplace', 'update', MARKETPLACE])
  const targets = mods.length > 0 ? mods : [...new Set(installed().filter(entry => isInScope(entry, scope)).map(modOf))]
  if (targets.length === 0) {
    console.log(`No ${MARKETPLACE} mod is installed in the ${scope} scope.`)
    return
  }
  for (const mod of targets) run(['plugin', 'update', `${mod}@${MARKETPLACE}`, '--scope', scope])
  console.log('Done. Restart Claude Code to use the new versions.')
}

function uninstall(mods, scope) {
  if (mods.length === 0) fail('name the mods to uninstall')
  for (const mod of mods) run(['plugin', 'uninstall', `${mod}@${MARKETPLACE}`, '--scope', scope])
  const hasMarketplace = readJson(['plugin', 'marketplace', 'list', '--json']).some(known => known.name === MARKETPLACE)
  if (hasMarketplace && installed().length === 0) run(['plugin', 'marketplace', 'remove', MARKETPLACE])
  console.log('Done.')
}

const { command, mods, scope } = parse(process.argv.slice(2))
if (command === 'help') {
  console.log(HELP)
  process.exit(0)
}
if (!SCOPES.includes(scope)) fail(`unknown scope "${scope}": use ${SCOPES.join(', ')}`)
const badName = mods.find(mod => !MOD_NAME.test(mod))
if (badName !== undefined) fail(`not a mod name: ${badName}`)
if (!claude(['--version'], true).isOk) fail('the Claude Code CLI (`claude`) is not on PATH: https://claude.com/claude-code')

const commands = { list: () => list(), install, update, uninstall }
const action = commands[command]
if (action === undefined) fail(`unknown command "${command}"\n\n${HELP}`)
action(mods, scope)
