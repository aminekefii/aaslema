import { describe, expect, it } from 'vitest'
import {
  avatarPath, cleanProfile, COUNTRIES, emailError, linkNotice, passwordError, profileChanged, profileForm,
} from './profile.js'

const form = (over = {}) => ({ full_name: 'Leila Ben Ali', phone: '', city: '', country: '', ...over })
const row = (over = {}) => ({ id: 'u1', full_name: 'Leila Ben Ali', phone: null, city: null, country: null, avatar_path: null, ...over })

describe('profileForm', () => {
  it('turns empty columns into empty strings', () => {
    expect(profileForm(row({ city: 'Sfax' }))).toEqual({ full_name: 'Leila Ben Ali', phone: '', city: 'Sfax', country: '' })
  })
})

describe('cleanProfile', () => {
  it('trims fields and turns empty optional fields into null', () => {
    expect(cleanProfile(form({ full_name: '  Leila  ', city: ' Sfax ', country: '   ' }))).toEqual({
      values: { full_name: 'Leila', phone: null, city: 'Sfax', country: null },
    })
  })

  it('needs a name', () => {
    expect(cleanProfile(form({ full_name: '   ' }))).toEqual({ error: 'Please enter your name.' })
  })

  it('allows 80 characters of name, counting emoji as one', () => {
    expect(cleanProfile(form({ full_name: 'a'.repeat(80) })).values.full_name).toHaveLength(80)
    expect(cleanProfile(form({ full_name: '😀'.repeat(80) })).values).toBeDefined()
    expect(cleanProfile(form({ full_name: 'a'.repeat(81) }))).toEqual({ error: 'Name is too long (80 characters max).' })
  })

  it('accepts common phone formats and collapses spaces', () => {
    expect(cleanProfile(form({ phone: '+216 20 123 456' })).values.phone).toBe('+216 20 123 456')
    expect(cleanProfile(form({ phone: ' +216   20  123 456 ' })).values.phone).toBe('+216 20 123 456')
    expect(cleanProfile(form({ phone: '(71) 123-456' })).values.phone).toBe('(71) 123-456')
  })

  it('rejects invalid phones', () => {
    for (const phone of ['12', 'abc123456', '++21620123456', '------', '+216 (1) - -', '1'.repeat(21)]) {
      expect(cleanProfile(form({ phone }))).toEqual({ error: 'Please enter a valid phone number.' })
    }
  })

  it('limits city and country to 60 characters', () => {
    expect(cleanProfile(form({ city: 'a'.repeat(60), country: 'b'.repeat(60) })).values).toBeDefined()
    expect(cleanProfile(form({ city: 'a'.repeat(61) }))).toEqual({ error: 'City is too long (60 characters max).' })
    expect(cleanProfile(form({ country: 'b'.repeat(61) }))).toEqual({ error: 'Country is too long (60 characters max).' })
  })
})

describe('profileChanged', () => {
  it('is false when the cleaned form matches the saved row', () => {
    expect(profileChanged(row(), form())).toBe(false)
    expect(profileChanged(row({ city: 'Sfax' }), form({ full_name: ' Leila Ben Ali ', city: 'Sfax ' }))).toBe(false)
  })

  it('is true when a field differs', () => {
    expect(profileChanged(row(), form({ phone: '+216 20 123 456' }))).toBe(true)
    expect(profileChanged(row({ country: 'Tunisia' }), form())).toBe(true)
  })

  it('is true for an invalid form, so Save can show the error', () => {
    expect(profileChanged(row(), form({ full_name: '' }))).toBe(true)
  })
})

describe('emailError', () => {
  it('needs a valid, different address', () => {
    expect(emailError('a@x.com', '  ')).toBe('Please enter an email address.')
    expect(emailError('a@x.com', 'nope')).toBe('Please enter a valid email address.')
    expect(emailError('a@x.com', 'b@x')).toBe('Please enter a valid email address.')
    expect(emailError('a@x.com', ' A@X.com ')).toBe("That's already your email.")
  })

  it('accepts a new address', () => {
    expect(emailError('a@x.com', ' new@x.com ')).toBeNull()
  })
})

describe('passwordError', () => {
  it('needs 8 characters and a matching confirmation', () => {
    expect(passwordError('short', 'short')).toBe('Password must be at least 8 characters.')
    expect(passwordError('longenough', 'different')).toBe("Passwords don't match.")
    expect(passwordError('longenough', 'longenough')).toBeNull()
  })
})

describe('avatarPath', () => {
  it('puts the photo in the user folder', () => {
    expect(avatarPath('u1', 'p1')).toBe('u1/p1.jpg')
  })
})

describe('linkNotice', () => {
  it('reads the message or error an email link puts in the hash', () => {
    expect(linkNotice('#message=Confirmation+link+accepted')).toEqual({ text: 'Confirmation link accepted' })
    expect(linkNotice('#error=access_denied&error_description=Email+link+is+invalid')).toEqual({ text: 'Email link is invalid', error: true })
  })

  it('ignores other hashes', () => {
    expect(linkNotice('')).toBeNull()
    expect(linkNotice('#access_token=x&type=email_change')).toBeNull()
  })
})

describe('COUNTRIES', () => {
  it('starts with Tunisia and has no duplicates', () => {
    expect(COUNTRIES[0]).toBe('Tunisia')
    expect(new Set(COUNTRIES).size).toBe(COUNTRIES.length)
  })
})
