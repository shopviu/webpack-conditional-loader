/* eslint-disable no-eval */
const os = require('os')
const startBlockJS = /\/\/ #if .*/
const endBlockJS = /\/\/ #endif$/
const startBlockHtml = /<!-- #if .*-->/
const endBlockHtml = /<!-- #endif -->$/

function getPredicate (line) {
  if (startBlockHtml.test(line)) {
    let predicateStartIndex = line.indexOf('#if') + 4
    let predecateEndIndex = line.indexOf(' -->')
    return line.substring(predicateStartIndex, predecateEndIndex)
  }
  return /\/\/ #if (.*)/.exec(line)[1]
}

function searchBlocks (sourceByLine) {
  const blocks = []
  let current = 0

  while (current < sourceByLine.length) {
    if (startBlockJS.test(sourceByLine[current]) || startBlockHtml.test(sourceByLine[current])) {
      let currentLine = sourceByLine[current]

      blocks[current] = {
        type: 'begin',
        predicate: getPredicate(currentLine)
      }

      current += 1
      continue
    }

    if (endBlockJS.test(sourceByLine[current]) || endBlockHtml.test(sourceByLine[current])) {
      blocks[current] = {
        type: 'end'
      }

      current += 1
      continue
    }

    current += 1
  }

  return blocks
}

function getTruthyBlocks (blocks) {
  const truthyBlocks = blocks.slice()
  let i = 0
  let action = ''

  while (i < truthyBlocks.length) {
    if (truthyBlocks[i] && truthyBlocks[i].type === 'begin') {
      if (eval(truthyBlocks[i].predicate)) {
        truthyBlocks[i] = undefined
        action = 'deleteNextEndBlock'
      }
    }

    if (truthyBlocks[i] && truthyBlocks[i].type === 'end' && action === 'deleteNextEndBlock') {
      truthyBlocks[i] = undefined
      action = ''
    }

    i += 1
  }

  return truthyBlocks
}

function commentCodeInsideBlocks (sourceByLine, blocks) {
  let currentBlock
  let i = 0
  let action = ''
  let sourceByLineTransformed = sourceByLine.slice()

  while (i < sourceByLine.length) {
    currentBlock = blocks[i]

    if (currentBlock && currentBlock.type === 'begin') {
      sourceByLineTransformed[i] = commentLine(sourceByLine[i])
      action = 'commentLine'
      i += 1
      continue
    }

    if (currentBlock && currentBlock.type === 'end') {
      sourceByLineTransformed[i] = commentLine(sourceByLine[i])
      action = ''
      i += 1
      continue
    }

    if (action === 'commentLine') {
      sourceByLineTransformed[i] = commentLine(sourceByLine[i])
    }

    i += 1
  }

  return sourceByLineTransformed
}

function commentLine (line) {
  return ''
}

module.exports = function (source) {
  try {
    const sourceByLine = source.split(os.EOL)
    const blocks = searchBlocks(sourceByLine)
    const truthyBlocks = getTruthyBlocks(blocks)
    const transformedSource = commentCodeInsideBlocks(sourceByLine, truthyBlocks)

    return transformedSource.join('\n')
  } catch (error) {
    console.error(error)
    throw error
  }
}
