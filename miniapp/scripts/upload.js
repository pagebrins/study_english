const path = require('path')

const ci = require('miniprogram-ci')

const getArgumentValue = (name, fallback) => {
  const target = `--${name}`
  const index = process.argv.findIndex((item) => item === target)
  if (index >= 0 && process.argv[index + 1]) {
    return process.argv[index + 1]
  }
  return fallback
}

const appid = process.env.MINIAPP_APPID || getArgumentValue('appid', '')
const privateKeyPath = process.env.MINIAPP_PRIVATE_KEY || getArgumentValue('private-key', '')
const version = process.env.MINIAPP_VERSION || getArgumentValue('version', '0.1.0')
const desc = process.env.MINIAPP_DESC || getArgumentValue('desc', 'study english miniapp upload')

if (!appid || !privateKeyPath) {
  throw new Error('MINIAPP_APPID and MINIAPP_PRIVATE_KEY are required for upload')
}

const project = new ci.Project({
  appid,
  type: 'miniProgram',
  projectPath: path.resolve(__dirname, '..'),
  privateKeyPath: path.resolve(privateKeyPath),
  ignores: ['node_modules/**/*'],
})

ci.upload({
  project,
  version,
  desc,
  setting: {
    es6: true,
    minify: true,
    codeProtect: false,
    autoPrefixWXSS: true,
  },
})
  .then(() => {
    process.stdout.write('Miniapp upload completed.\n')
  })
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exit(1)
  })
