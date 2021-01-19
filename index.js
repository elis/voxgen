const chalk = require('chalk')
const program = require('commander')
const packageJSON = require('./package.json')

const list = require('./lib/list')
const vocalize = require('./lib/vocalize')

const { getVoicepacks, prefix } = require('./lib/util')

const run = async (words, options) => {
  const isList = options.list || options.search

  isList && (await list(options))
  !isList && (await vocalize(words, options))
}

const main = async () => {
  const voicepacks = await getVoicepacks()

  program
    .name(Object.keys(packageJSON.bin)[0] || 'vox')
    .version(packageJSON.version)
    .addOption(
      new program.Option('-v, --voice <voice>', 'Select voice')
        .default(voicepacks?.[0])
        .choices(voicepacks || [])
    )
    .addOption(
      new program.Option(
        '-f, --path [path]',
        'Set voicepack path (override -v option)'
      )
    )
    .addOption(new program.Option('-l, --list [letter]', 'List words'))
    .addOption(
      new program.Option('-s, --search <search>', 'Search in available words')
    )
    .addOption(new program.Option('-c, --compact', 'Compact result'))
    .addOption(new program.Option('-r, --repeat <n>', 'Repeat n times'))
    .addOption(
      new program.Option('-p, --pause <n>', 'Pause between repeats').default(
        1400
      )
    )
    .addOption(
      new program.Option('-d, --delay <n>', 'Delay between words').default(350)
    )
    .addOption(new program.Option('-i, --ignore', 'Ignore errors'))
    .addOption(new program.Option('-x, --random [n]', 'Pick random (n) words'))
    .arguments('[words...]')
    .description(
      chalk`${description}${!voicepacks?.length ? '\n' + warning : ''}`,
      {
        words: 'words to say'
      }
    )
    .addHelpText('after', docs)
    .action(run)

  await program.parseAsync(process.argv)
}

const docs = chalk`
You can use the {blue wait:1234} modifier to add a custom delay (in milliseconds) between specific words.
e.g. {cyan $ vox echo go wait:1200 helium}
`
const description = chalk`${prefix}${packageJSON.description}`
const warning = chalk`${prefix}{bgYellow.black  Alert } No installed voice packs detected.`

module.exports = main
