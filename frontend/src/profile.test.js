import { describe, expect, it } from 'vitest'
import {
  avatarPath, cleanProfile, COUNTRIES, emailError, linkNotice, newPasswordError, passwordError, profileChanged, profileForm, TRAVEL_STYLES,
} from './profile.js'

const form = (over = {}) => ({ full_name: 'Leila Ben Ali', phone: '', city: '', country: '', bio: '', travel_style: '', ...over })
const row = (over = {}) => ({ id: 'u1', full_name: 'Leila Ben Ali', phone: null, city: null, country: null, avatar_path: null, bio: null, travel_style: null, ...over })

describe('profileForm', () => {
  it('turns empty columns into empty strings', () => {
    expect(profileForm(row({ city: 'Sfax' }))).toEqual({ full_name: 'Leila Ben Ali', phone: '', city: 'Sfax', country: '', bio: '', travel_style: '' })
  })
})

describe('cleanProfile', () => {
  it('trims fields and turns empty optional fields into null', () => {
    expect(cleanProfile(form({ full_name: '  Leila  ', city: ' Sfax ', country: '   ' }))).toEqual({
      values: { full_name: 'Leila', phone: null, city: 'Sfax', country: null, bio: null, travel_style: null },
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

describe('cleanProfile: public card fields', () => {
  it('trims the bio and keeps its line breaks', () => {
    expect(cleanProfile(form({ bio: '  Backpacking the south.\nNext: Tataouine.  ' })).values.bio).toBe('Backpacking the south.\nNext: Tataouine.')
  })

  it('limits the bio to 300 characters', () => {
    expect(cleanProfile(form({ bio: 'a'.repeat(300) })).values.bio).toHaveLength(300)
    expect(cleanProfile(form({ bio: 'a'.repeat(301) }))).toEqual({ error: 'About you is too long (300 characters max).' })
  })

  it('accepts only a listed travel style', () => {
    expect(cleanProfile(form({ travel_style: 'bikepacker' })).values.travel_style).toBe('bikepacker')
    expect(cleanProfile(form({ travel_style: 'astronaut' }))).toEqual({ error: 'Please choose a travel style from the list.' })
  })

  it('lists five travel styles with labels', () => {
    expect(TRAVEL_STYLES.map(([value]) => value)).toEqual(['backpacker', 'bikepacker', 'road-tripper', 'culture', 'beach'])
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
    expect(profileChanged(row(), form({ bio: 'Hi' }))).toBe(true)
    expect(profileChanged(row({ travel_style: 'beach' }), form({ travel_style: 'beach' }))).toBe(false)
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
    expect(passwordError('longenough1', 'different')).toBe("Passwords don't match.")
    expect(passwordError('longenough1', 'longenough1')).toBeNull()
  })

  it('needs letters and numbers', () => {
    expect(passwordError('00000000', '00000000')).toBe('Password must include letters and numbers.')
    expect(passwordError('aaaaaaaa', 'aaaaaaaa')).toBe('Password must include letters and numbers.')
  })
})

describe('newPasswordError', () => {
  it('accepts letters with numbers, any language', () => {
    expect(newPasswordError('tunis2026')).toBeNull()
    expect(newPasswordError('مدينة2026')).toBeNull()
    expect(newPasswordError('12345678')).toBe('Password must include letters and numbers.')
    expect(newPasswordError('abc1')).toBe('Password must be at least 8 characters.')
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
