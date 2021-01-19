const path = require('path')
const chalk = require('chalk')
const ansiEscapes = require('ansi-escapes')
const termSize = require('term-size')
const stringWidth = require('string-width')

const echo = (str) => process.stdout.write(str)

const prefix = chalk`{bgYellow.black  λ } `

const PATHS = {
  voicepacks: 'assets/voicepacks'
}

const parseOptions = (options) => {
  const voicepath =
    typeof options.path === 'string'
      ? options.path
      : options.path
      ? './'
      : path.resolve(__dirname, '../', PATHS.voicepacks, options.voice)
  return {
    voicepath
  }
}

const getVoicepacks = async () => {
  try {
    const { readdir } = require('fs/promises')
    const result = await readdir(
      path.resolve(__dirname, '../', PATHS.voicepacks)
    )
    return result
  } catch (err) {
    return []
  }
}

function CLIState() {
  const state = {
    lines: 0
  }

  const line = (input) => {
    const lines = Math.ceil(stringWidth(input) / termSize().columns)

    state.lines += lines
    echo(input + '\n')
  }

  const clear = () => {
    if (state.lines) echo(ansiEscapes.eraseLines(state.lines + 1))
    state.lines = 0
  }

  return { line, clear }
}

module.exports = {
  echo,
  parseOptions,
  getVoicepacks,
  CLIState,
  prefix,
  PATHS
}
