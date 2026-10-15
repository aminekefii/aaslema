import { describe, expect, it } from 'vitest'
import { messageFromForm } from './contactMessage.js'

const valid = { name: 'Leila', email: 'leila@mail.com', subject: 'Bikes', message: 'Hello!', website: '' }
const send = (over, user = null) => messageFromForm({ ...valid, ...over }, user)
const x = (n) => 'x'.repeat(n)

describe('messageFromForm', () => {
  it('builds a trimmed row for a visitor', () => {
    expect(send({ name: '  Leila  ', email: ' leila@mail.com ', subject: ' Bikes ', message: '  Hello!  ' })).toEqual({
      row: { name: 'Leila', email: 'leila@mail.com', subject: 'Bikes', message: 'Hello!', user_id: null },
    })
  })

  it('links the message to a signed-in user', () => {
    expect(send({}, { id: 'u-1', email: 'leila@mail.com' }).row.user_id).toBe('u-1')
  })

  it('stores an empty or missing subject as null', () => {
    expect(send({ subject: '   ' }).row.subject).toBe(null)
    expect(messageFromForm({ name: 'A', email: 'a@b.co', message: 'Hi' }, null).row.subject).toBe(null)
  })

  it('flags the hidden website field as spam before any other check', () => {
    expect(send({ website: 'http://spam.example', name: '' })).toEqual({ spam: true })
    expect(send({ website: '   ' }).row).toBeDefined()
  })

  it('requires a name', () => {
    expect(send({ name: '   ' })).toEqual({ error: 'Please enter your name.' })
    expect(messageFromForm({ email: 'a@b.co', message: 'Hi' }, null)).toEqual({ error: 'Please enter your name.' })
  })

  it('limits the name to 100 characters', () => {
    expect(send({ name: x(100) }).row).toBeDefined()
    expect(send({ name: x(101) })).toEqual({ error: 'Your name is too long (100 characters max).' })
  })

  it.each(['', 'leila', 'leila@', '@mail.com', 'leila@mail', 'le ila@mail.com', 'a@b@c.com'])('rejects the email "%s"', (email) => {
    expect(send({ email })).toEqual({ error: 'Please enter a valid email address.' })
  })

  it('accepts usual email addresses and limits them to 254 characters', () => {
    expect(send({ email: 'a.b+c@sub.mail.tn' }).row).toBeDefined()
    expect(send({ email: `${x(245)}@mail.com` }).row).toBeDefined()
    expect(send({ email: `${x(246)}@mail.com` })).toEqual({ error: 'Please enter a valid email address.' })
  })

  it('limits the subject to 150 characters', () => {
    expect(send({ subject: x(150) }).row).toBeDefined()
    expect(send({ subject: x(151) })).toEqual({ error: 'Your subject is too long (150 characters max).' })
  })

  it('requires a message', () => {
    expect(send({ message: ' \n ' })).toEqual({ error: 'Please write a message.' })
  })

  it('limits the message to 5000 characters', () => {
    expect(send({ message: x(5000) }).row).toBeDefined()
    expect(send({ message: x(5001) })).toEqual({ error: 'Your message is too long (5000 characters max).' })
  })
})
