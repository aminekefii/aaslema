import { describe, expect, it } from 'vitest'
import { filterByStatus, isHandled, messageCounts, messagePreview, replyHref } from './adminMessages.js'

const msg = (over) => ({
  id: 'id', created_at: '2026-10-15T10:00:00Z', name: 'Leila', email: 'leila@mail.com',
  subject: null, message: 'Hello', user_id: null, handled_at: null, ...over,
})

const list = [msg({ id: '1' }), msg({ id: '2', handled_at: '2026-10-15T11:00:00Z' }), msg({ id: '3' })]
const ids = (ms) => ms.map((m) => m.id)

describe('isHandled', () => {
  it('is true only when handled_at is set', () => {
    expect(isHandled(msg({}))).toBe(false)
    expect(isHandled(msg({ handled_at: '2026-10-15T11:00:00Z' }))).toBe(true)
  })
})

describe('filterByStatus', () => {
  it('splits new and handled, keeping order', () => {
    expect(ids(filterByStatus(list, 'new'))).toEqual(['1', '3'])
    expect(ids(filterByStatus(list, 'handled'))).toEqual(['2'])
    expect(ids(filterByStatus(list, 'all'))).toEqual(['1', '2', '3'])
  })
})

describe('messageCounts', () => {
  it('counts each tab', () => {
    expect(messageCounts(list)).toEqual({ new: 2, handled: 1, all: 3 })
    expect(messageCounts([])).toEqual({ new: 0, handled: 0, all: 0 })
  })
})

describe('messagePreview', () => {
  it('uses the subject when there is one', () => {
    expect(messagePreview(msg({ subject: 'Bikes on the TGM', message: 'Long text' }))).toBe('Bikes on the TGM')
  })

  it('falls back to the message with whitespace collapsed', () => {
    expect(messagePreview(msg({ message: '  Hello\n\nthere   friend ' }))).toBe('Hello there friend')
  })

  it('cuts long text and adds an ellipsis', () => {
    expect(messagePreview(msg({ message: 'x'.repeat(80) }))).toBe('x'.repeat(80))
    expect(messagePreview(msg({ message: 'x'.repeat(81) }))).toBe(`${'x'.repeat(80)}…`)
    expect(messagePreview(msg({ message: 'abcdef' }), 3)).toBe('abc…')
  })
})

describe('replyHref', () => {
  it('replies to the sender with "Re:" and the subject', () => {
    expect(replyHref(msg({ subject: 'Bikes & trains?' }))).toBe('mailto:leila@mail.com?subject=Re%3A%20Bikes%20%26%20trains%3F')
  })

  it('encodes non-ASCII subjects and special characters in the address', () => {
    expect(replyHref(msg({ email: 'a+b@mail.com', subject: 'Été à Tozeur' })))
      .toBe('mailto:a%2Bb@mail.com?subject=Re%3A%20%C3%89t%C3%A9%20%C3%A0%20Tozeur')
  })

  it('uses a default subject when there is none', () => {
    expect(replyHref(msg({}))).toBe('mailto:leila@mail.com?subject=Re%3A%20Your%20message%20to%20Aaslema')
  })
})
