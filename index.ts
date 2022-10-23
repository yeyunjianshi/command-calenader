#! /usr/bin/env node

import { emitKeypressEvents, createInterface } from 'readline'
import { stdin, stdout, exit } from 'process'
import kleur from 'kleur'
import escapes from 'ansi-escapes'

type Render = {
  render: () => void
}

type Action = {
  action: (str: string) => void
}

type Calendar = Render & Action

function createCalendar(
  initialDate: Date = new Date(),
  outStream: NodeJS.WriteStream = stdout
): Calendar {
  const date = initialDate

  let year = date.getFullYear()
  let month = date.getMonth()
  let day = date.getDate()
  let totalDays = new Date(year, month + 1, 0).getDate()

  let isFirstRender = true

  function formatNumber(num: string | number, length: number, sign = ' ') {
    return (Array(length).fill(sign).join('') + num).slice(-length)
  }

  function getHead() {
    const yearAndMonth = kleur
      .green()
      .bold(year + ' ' + formatNumber(month + 1, 2))

    return (
      '--------------------------- \n' +
      `<         ${yearAndMonth}         >\n` +
      '--------------------------- \n' +
      'Mon Tue Wed Thu Fri Sat Sun \n'
    )
  }

  function getConent() {
    const renderDate = new Date(year, month, 1)
    const firstWeekday = (renderDate.getDay() + 6) % 7

    function colorDay(d: number): string {
      const renderDay = formatNumber(d, 2)
      if (
        renderDate.getFullYear() === new Date().getFullYear() &&
        renderDate.getMonth() === new Date().getMonth() &&
        new Date().getDate() === d
      ) {
        return kleur.green().bold(renderDay)
      } else if (
        renderDate.getFullYear() === year &&
        renderDate.getMonth() === month &&
        day === d
      ) {
        return kleur.red().bold(renderDay)
      }
      return renderDay
    }

    let content =
      Array(firstWeekday).fill('    ').join('') +
      Array(totalDays)
        .fill(1)
        .map(
          (_, i) =>
            ` ${colorDay(i + 1)} ` + ((firstWeekday + i) % 7 === 6 ? '\n' : '')
        )
        .join('')
    if (!content.endsWith('\n')) content += '\n'
    return content
  }

  function getFooter() {
    return '--------------------------- \n'
  }

  function getPage() {
    return getHead() + getConent() + getFooter()
  }

  function update(deltaDay = 0, deltaMonth = 0) {
    if (
      (deltaDay < 0 || deltaMonth < 0) &&
      year === 1970 &&
      month === 1 &&
      day === 1
    )
      return

    day += deltaDay
    month += deltaMonth

    if (day < 1) month -= 1
    else if (day > totalDays) {
      month += 1
      day -= totalDays
    }

    if (month < 0) {
      year -= 1
      month = 11
    } else if (month > 11) {
      year += 1
      month = 0
    }

    totalDays = new Date(year, month + 1, 0).getDate()
    if (day < 1) day += totalDays
    if (day > totalDays) day = totalDays
  }

  function action(actionName: string) {
    switch (actionName) {
      case 'left':
        update(-1)
        break
      case 'right':
        update(1)
        break
      case 'up':
        update(-7)
        break
      case 'down':
        update(7)
        break
      case 'previous':
        update(0, -1)
        break
      case 'next':
        update(0, 1)
        break
      default:
        return
    }
    render()
  }

  let renderPageContent: string
  function render() {
    if (!isFirstRender) {
      const lines = renderPageContent.split('\n').length
      if (lines > 0) outStream.write(escapes.eraseLines(lines))
    } else {
      isFirstRender = false
    }
    renderPageContent = getPage()
    outStream.write(renderPageContent)
  }

  return {
    render,
    action,
  }
}

function ActionListen(
  action: Action,
  inputStream: NodeJS.ReadStream = stdin,
  outStream: NodeJS.WriteStream = stdout
) {
  const rl = createInterface({
    input: inputStream,
    output: outStream,
  })

  emitKeypressEvents(inputStream, rl)
  if (inputStream.isTTY) inputStream.setRawMode(true)

  const keyMapAction = new Map<string, string>([
    ['a', 'left'],
    ['d', 'right'],
    ['w', 'up'],
    ['s', 'down'],
    ['q', 'previous'],
    ['e', 'next'],
  ])

  const keypress = (str: unknown, key: { name: string }) => {
    if (keyMapAction.has(key.name)) {
      action.action(keyMapAction.get(key.name) as string)
    }
    if (key.name === 'escape') return exit()
  }

  inputStream.on('keypress', keypress)
}

const calender = createCalendar()
calender.render()
ActionListen(calender)
