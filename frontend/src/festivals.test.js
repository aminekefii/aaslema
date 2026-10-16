import { describe, expect, it } from 'vitest'
import { allFestivals, festivalCards, festivalRegions } from './festivals.js'

describe('festival ids', () => {
  const all = allFestivals()

  it('gives every festival a well-formed id', () => {
    for (const f of all) expect(f.id).toMatch(/^[a-z0-9-]{1,60}$/)
  })

  it('never repeats an id', () => {
    expect(new Set(all.map((f) => f.id)).size).toBe(all.length)
  })
})

describe('allFestivals', () => {
  it('lists every festival in page order with its region', () => {
    const all = allFestivals()
    expect(all).toHaveLength(festivalRegions.reduce((n, r) => n + r.festivals.length, 0))
    expect(all[0]).toMatchObject({ id: 'international-festival-of-carthage', regionId: 'greater-tunis', region: 'Greater Tunis' })
  })
})

describe('festivalCards', () => {
  const list = [
    { id: 'jazz-a-carthage', name: 'Jazz à Carthage', when: 'April', regionId: 'greater-tunis', region: 'Greater Tunis' },
    { id: 'dougga-festival', name: 'Dougga festival', when: 'July', regionId: 'north', region: 'North and Northwest' },
  ]

  it('maps plan rows to cards, keeping the order given', () => {
    const rows = [{ festival_id: 'dougga-festival', created_at: '2026-10-16T10:00:00Z' }, { festival_id: 'jazz-a-carthage', created_at: '2026-10-01T10:00:00Z' }]
    expect(festivalCards(rows, list)).toEqual([
      { id: 'dougga-festival', name: 'Dougga festival', region: 'North and Northwest', regionId: 'north', when: 'July', at: '2026-10-16T10:00:00Z' },
      { id: 'jazz-a-carthage', name: 'Jazz à Carthage', region: 'Greater Tunis', regionId: 'greater-tunis', when: 'April', at: '2026-10-01T10:00:00Z' },
    ])
  })

  it('skips festivals that no longer exist', () => {
    expect(festivalCards([{ festival_id: 'gone', created_at: '2026-10-16T10:00:00Z' }], list)).toEqual([])
  })
})
