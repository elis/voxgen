const ansiEscapes = require('ansi-escapes');
const chalk = require('chalk')
const Table = require('cli-table3');

const docs = chalk`
You can use the {blue wait:1234} modifier to add a custom delay (in milliseconds) between specific words.
e.g. {cyan $ vox echo go wait:1200 helium}
`

function run() {
  const prefix = chalk`{bgYellow.black  λ } `
  const voicepacks = require('fs').readdirSync(require('path').resolve(__dirname, 'assets', 'voicepacks'))
  if (!voicepacks || !voicepacks.length) {
    console.log(chalk`${prefix}{bgRed.black ERROR} No voicepacks found`)
    return
  }
  // check autocomplete
  // if handled the process will exit
  const program = require('commander')
    program
    .version('0.1.0')
    .addOption(new program.Option('-v, --voice <voice>', 'Select voice').default(voicepacks[0]).choices(voicepacks))
    .addOption(new program.Option('-l, --list [letter]', 'List words'))
    .addOption(new program.Option('-s, --search <search>', 'Search in available words'))
    .addOption(new program.Option('-c, --compact', 'Compact result'))
    .addOption(new program.Option('-r, --repeat <n>', 'Repeat n times'))
    .addOption(new program.Option('-p, --pause <n>', 'Pause between repeats').default(1400))
    .addOption(new program.Option('-d, --delay <n>', 'Delay between words').default(350))
    .addOption(new program.Option('-x, --random [n]', 'Pick random (n) words'))
    .arguments('[words...]')
    .description(prefix + 'Speech synthensizing from the cli using Half-Life and Black Mesa VOX soundpacks', {
      words: 'words to say'
    })
    .addHelpText('after', docs)
    .action((words, options, ...rest) => {

      const voice = options.voice
      const getFilepath = (n) => './assets/voicepacks/' + voice + '/' + n + '.wav'

      if (options.list || options.search) {
        var table = new Table({
            head: options.compact ? ['Letter', 'Words'] : ['Letter', 'Word', 'filename'],
            colWidths: options.compact ? [8, 40] : [8, 18],
          wordWrap:true
        });
        const letters = {}
         
        const files = require('fs').readdirSync(require('path').resolve(__dirname, 'assets', 'voicepacks', voice))
        const search = (options.search || typeof options.list === 'string') && new RegExp(options.search ? options.search : `^${options.list}`, 'gi')
        const wordsList = files
          .filter(f => f.match(/\.wav$/)).map(f => f.replace(/\.wav$/, '')).sort()
          .filter(word => !search || word.match(search))
        
        
        wordsList.map(word => letters[word[0]] = [...letters[word[0]] || [], word])
        Object.keys(letters).sort().map(letter => {
          const letterWords = letters[letter]
          const compact = options.compact && letterWords.join(', ')
          table.push([
            ...compact
              ? [letter.toUpperCase(), { content: compact }]
              : [
            { 
              rowSpan: letterWords.length,
              content: letter.toUpperCase()
            },
                letterWords[0], getFilepath(letterWords[0])]
          ])

          if (!compact)
            letterWords.map((word, i) => i && table.push([word, getFilepath(word)]))
        })
        table.push([{ colSpan: options.compact ? 2 : 3, content: `Total${search ? ' results' : ''}: ${wordsList.length}` }])

        process.stdout.write(table.toString());
        process.stdout.write('\n');
      } else {
        if (!words || !words.length) {
          if (options.random) { 

            const files = require('fs').readdirSync(require('path').resolve(__dirname, 'assets', voice))
            const wordsList = files
              .filter(f => f.match(/\.wav$/)).map(f => f.replace(/\.wav$/, '')).sort(() => Math.random() > 0.5 ? 1 : -1)
            const wordsCount = +options.random > 1 ? options.random : Math.floor(Math.random() * 12)
            for (let i = 0; i < wordsCount; ++i) words.push(wordsList[i])
          } else {
            words = Math.random() > 0.7 ? 'bloop wait:1200 no'.split(' ') : 'bloop must command'.split(' ')
          }
        }

        const player = require('node-wav-player');
        var wavFileInfo = require('wav-file-info');

        let times = 0
        let word
        const pause = options.pause

        const started = Date.now()
        const compact = options.compact

        !compact && console.log(chalk`${prefix}Synthesizing speech {dim — using {green ${options.voice}} voicepack}`)
        !compact && options.repeat && line(chalk`\n${prefix}{dim Repeating ${options.repeat} times}`)
        !compact && line(`${prefix}${words.join(' ')}`)

        const playNext = async () => {
          if (!word && word !== 0) word = 0
          else word++

          !compact && clear()

          const timerDisplay = async (time, interval = 50, fn) => {
            process.stdout.write(ansiEscapes.eraseLines(2))
            fn()
            await new Promise(r => setTimeout(r, interval))
            if (time - (interval * 5) > 0) timerDisplay(time - interval, interval, fn)
          }

          const done = async () => {
            if (options.repeat && ++times < options.repeat) {
              word = false
              !compact && clear()
              !compact && options.repeat && line(chalk`{dim ${prefix}Cycle ${times} of ${options.repeat} complete in ${Date.now() - started}ms. (CTRL+C to stop)}`)
              
              const then = Date.now()
              !compact && line(chalk`${prefix}{dim.green "${words.join(' ')}"}`)
              !compact && line(chalk`${prefix}{dim Repeating in ${options.pause}ms}`)
              !compact && await timerDisplay(options.pause, 50, () => {
                console.log(chalk`${prefix}{dim Repeating in ${options.pause - (Date.now() - then)}ms...}`)
              })
              await new Promise(r => setTimeout(r, options.pause))
              playNext()
            } else {
              !compact && clear()
              line(chalk`${prefix}{green "${words.join(' ')}}"`)
              options.repeat 
                ? line(chalk`${prefix}{dim Completed ${options.repeat} cycles in ${Date.now() - started}ms.}`)
                : line(chalk`${prefix}{dim Complete in ${Date.now() - started}ms.}`)
            }
          }

          !compact && options.repeat && line(chalk`${prefix}{dim Cycle ${times + 1} of ${options.repeat}... (CTRL+C to stop)}`)
          !compact && line(chalk`${prefix}{dim "${words.map((w, i) => i === word ? chalk.reset.blue.underline(w) : i < word ? chalk.dim.green(w) : chalk.dim(w)).join(' ')}}{dim "}`);
          
          const sayWord = words[word]
          if (!sayWord) done() 
          else {

            const filepath = getFilepath(sayWord)
            const delay = +options.delay
  
            const [, action, params] = sayWord.match(/^(.*):(.*)$/i) || []

            if (action) {
              if (action === 'wait') {
                // process.stdout.write(chalk`\n${prefix}{dim Waiting ${+params}ms...}\n`);
                !compact && line(chalk`${prefix}{dim Waiting ${+params}ms...}`);
                await new Promise(r => setTimeout(r, +params))
                playNext()
              }
            } else
              try {
                wavFileInfo
                  .infoByFilename(filepath, async (err, info) => {
                    if (err) {
                      throw err;
                    }
      
                    const duration = Math.floor(info.duration * 1000)
                    const waitFor = Math.floor(info.duration * 1000) - 350
      
                    !compact && line(chalk`${prefix}{dim Playing "${sayWord}" — ${duration}ms...}`);
      
                    const start = Date.now()
                    player.play({ path: filepath })
                    .then(async () => {
                      if (word < words.length - 1) {
                        const end = Date.now()
                        const diff = end - start

                        await new Promise((r) => setTimeout(r, waitFor - diff))
                        delay && await new Promise((r) => setTimeout(r, delay))
                        playNext()
                      } else {
                        done()
                      }
                    })
                  });
              } catch (error) {
                !compact && clear()
                line(chalk`${prefix}{dim "${words.map((w, i) => i === word ? chalk.yellow.underline(w) : i < word ? chalk.dim.green(w) : chalk.dim(w)).join(' ')}"}`)
                line(chalk`${prefix}{bgRed.black ERROR} "${sayWord}" ${error}`);
              }
          }

        }

        playNext()
      }
    });
  program.parse(process.argv);

}
module.exports = {
  run
  // run: () => myRun()
}

const state = {}

const line = (input) => {
  state.lines = (state.lines || 0) + input.split('\n').length
  process.stdout.write(input + '\n')
}

const overline = (input) => {
  state.lines = ((state.lines || 0) + input.split('\n').length) - 1
  process.stdout.write(ansiEscapes.eraseLines(2))
  process.stdout.write(input + '\n')
}

const clear = () => {
  if (state.lines)
    process.stdout.write(ansiEscapes.eraseLines(state.lines + 1))
    state.lines = 0
}

const myRun = async () => {
  var table = new Table({
    style:{head:[],border:[]},
    colWidths: [14, 18],
    wordWrap:true
  });

  table.push(['playing', 'wav', './assets/vox/wav.wav', 12.32 + 'ms'])
  line(table.toString())
  // await new Promise(r => setTimeout(r, 1000))
  // clear()
}
