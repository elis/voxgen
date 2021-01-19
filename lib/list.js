const Table = require('cli-table3')
const path = require('path')
const { parseOptions } = require('./util')

async function list(options) {
  const { readdir } = require('fs/promises')

  const table = new Table({
    head: options.compact
      ? ['Letter', 'Words']
      : ['Letter', 'Word', 'Filename'],
    colWidths: options.compact ? [8, 40] : [8, 18],
    wordWrap: true
  })
  const letters = {}

  const settings = parseOptions(options)
  const files = await readdir(settings.voicepath)

  const search =
    (options.search || typeof options.list === 'string') &&
    new RegExp(options.search ? options.search : `^${options.list}`, 'gi')
  const wordsList = files
    .filter((f) => f.match(/\.wav$/))
    .map((f) => f.replace(/\.wav$/, ''))
    .sort()
    .filter((word) => !search || word.match(search))

  wordsList.forEach(
    (word) => (letters[word[0]] = [...(letters[word[0]] || []), word])
  )

  Object.keys(letters)
    .sort()
    .forEach((letter) => {
      const letterWords = letters[letter]
      const compact = options.compact && letterWords.join(', ')
      table.push(
        compact
          ? [letter.toUpperCase(), { content: compact }]
          : [
              { rowSpan: letterWords.length, content: letter.toUpperCase() },
              letterWords[0],
              path.resolve(settings.voicepath, letterWords[0] + '.wav')
            ]
      )

      !compact &&
        letterWords.forEach(
          (word, i) =>
            i &&
            table.push([word, path.resolve(settings.voicepath, word + '.wav')])
        )
    })
  table.push([
    {
      colSpan: options.compact ? 2 : 3,
      content: `Total${search ? ' results' : ''}: ${wordsList.length}`
    }
  ])

  process.stdout.write(table.toString())
  process.stdout.write('\n')
}

module.exports = list
