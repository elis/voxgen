const chalk = require('chalk')
const ansiEscapes = require('ansi-escapes')
const player = require('node-wav-player')
const wavFileInfo = require('wav-file-info')
const path = require('path')

const { readdir } = require('fs/promises')
const { echo, prefix, parseOptions, CLIState } = require('./util')

async function vocalize(words, options) {
  const settings = parseOptions(options)

  if (!words || !words.length) {
    if (options.random) {
      const files = await readdir(settings.voicepath)
      const wordsList = files
        .filter((f) => f.match(/\.wav$/))
        .map((f) => f.replace(/\.wav$/, ''))
        .sort(() => (Math.random() > 0.5 ? 1 : -1))
      const wordsCount =
        +options.random > 1
          ? options.random
          : Math.floor(Math.random() * 12) + 1
      for (let i = 0; i < wordsCount; ++i)
        words.push(wordsList[Math.floor(Math.random() * wordsList.length)])
    } else {
      words =
        Math.random() > 0.7
          ? 'bloop wait:1200 no'.split(' ')
          : 'bloop must command'.split(' ')
    }
  }

  return play(words, options, settings)
}

async function play(words, options, settings) {
  const { line, clear } = CLIState()

  let times = 0
  let word

  const started = Date.now()
  const compact = options.compact

  !compact &&
    echo(
      chalk`${prefix}Synthesizing speech {dim — using {green ${
        options.path ? settings.voicepath : options.voice
      }} voicepack}\n`
    )
  !compact &&
    options.repeat &&
    line(chalk`${prefix}{dim Repeating ${options.repeat} times}`)
  !compact && line(`${prefix}${words.join(' ')}`)

  process.on('SIGINT', function () {
    clear()
    echo(
      chalk`${prefix}{dim "${words
        .map((w, i) =>
          i === word
            ? chalk.yellow.underline(w)
            : i < word
            ? chalk.dim.green(w)
            : chalk.dim(w)
        )
        .join(' ')}"}\n`
    )
    echo(`${prefix}Aborted.\n`)
    process.exit()
  })
  const playNext = async () => {
    if (!word && word !== 0) word = 0
    else word++

    !compact && clear()

    const timerDisplay = async (time, interval = 50, fn) => {
      echo(ansiEscapes.eraseLines(2))
      fn()
      await new Promise((r) => setTimeout(r, interval))
      if (time - interval * 5 > 0) timerDisplay(time - interval, interval, fn)
    }

    const onComplete = async () => {
      if (options.repeat && ++times < options.repeat) {
        word = false
        !compact && clear()
        !compact &&
          options.repeat &&
          line(
            chalk`{dim ${prefix}Cycle ${times} of ${
              options.repeat
            } complete in ${Date.now() - started}ms. (CTRL+C to stop)}`
          )

        const then = Date.now()
        !compact && line(chalk`${prefix}{dim.green "${words.join(' ')}"}`)
        !compact && line(chalk`${prefix}{dim Repeating in ${options.pause}ms}`)
        !compact &&
          (await timerDisplay(options.pause, 50, () => {
            echo(
              chalk`${prefix}{dim Repeating in ${
                options.pause - (Date.now() - then)
              }ms...}\n`
            )
          }))
        await new Promise((r) => setTimeout(r, options.pause))
        playNext()
      } else {
        !compact && clear()
        line(chalk`${prefix}"{green ${words.join(' ')}}"`)
        options.repeat
          ? line(
              chalk`${prefix}{dim Completed ${options.repeat} cycles in ${
                Date.now() - started
              }ms.}`
            )
          : line(chalk`${prefix}{dim Complete in ${Date.now() - started}ms.}`)
      }
    }

    !compact &&
      options.repeat &&
      line(
        chalk`${prefix}{dim Cycle ${times + 1} of ${
          options.repeat
        }... (CTRL+C to stop)}`
      )
    !compact &&
      line(
        chalk`${prefix}{dim "${words
          .map((w, i) =>
            i === word
              ? chalk.reset.blue.underline(w)
              : i < word
              ? chalk.dim.green(w)
              : chalk.dim(w)
          )
          .join(' ')}}{dim "}`
      )

    const sayWord = words[word]
    if (!sayWord) return onComplete()
    else {
      const filepath = path.resolve(settings.voicepath, sayWord + '.wav')
      const delay = +options.delay

      const [, action, params] = sayWord.match(/^(.*):(.*)$/i) || []

      if (action && action === 'wait') {
        !compact && line(chalk`${prefix}{dim Waiting ${+params}ms...}`)
        await new Promise((r) => setTimeout(r, +params))
        playNext()
      } else {
        try {
          const info = await new Promise((resolve, reject) =>
            wavFileInfo.infoByFilename(filepath, async (err, info) => {
              err ? reject(err) : resolve(info)
            })
          )

          const duration = Math.floor(info.duration * 1000)
          const waitFor = Math.floor(info.duration * 1000) - 350

          !compact &&
            line(chalk`${prefix}{dim Playing "${sayWord}" — ${duration}ms...}`)

          const start = Date.now()
          await player.play({ path: filepath })

          if (word < words.length - 1) {
            const end = Date.now()
            const diff = end - start

            await new Promise((r) => setTimeout(r, waitFor - diff))
            delay && (await new Promise((r) => setTimeout(r, delay)))
            playNext()
          } else {
            onComplete()
          }
        } catch (error) {
          !compact && clear()
          line(
            chalk`${prefix}{dim "${words
              .map((w, i) =>
                i === word
                  ? chalk.yellow.underline(w)
                  : i < word
                  ? chalk.dim.green(w)
                  : chalk.dim(w)
              )
              .join(' ')}"}`
          )
          line(chalk`${prefix}{bgRed.black ERROR} "${sayWord}" ${error}`)
          options.ignore && playNext()
        }
      }
    }
  }

  return playNext()
}

module.exports = vocalize
