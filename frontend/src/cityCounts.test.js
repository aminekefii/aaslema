import { describe, expect, it } from 'vitest'
import { adjustCount, countsFromRows, likeCount, mostVisited, toggleId } from './cityCounts.js'

describe('countsFromRows', () => {
  it('turns rows into numbers per city, including bigint strings', () => {
    expect(countsFromRows([{ city_id: 'tozeur', likes: '2' }, { city_id: 'tunis', likes: 5 }])).toEqual({ tozeur: 2, tunis: 5 })
  })

  it('returns an empty map for no rows', () => {
    expect(countsFromRows([])).toEqual({})
  })

  it('reads another count column by name', () => {
    expect(countsFromRows([{ city_id: 'tozeur', visits: '3' }], 'visits')).toEqual({ tozeur: 3 })
  })
})

describe('likeCount', () => {
  it('reads a city count, 0 when missing', () => {
    expect(likeCount({ tozeur: 2 }, 'tozeur')).toBe(2)
    expect(likeCount({ tozeur: 2 }, 'tunis')).toBe(0)
  })

  it('is 0 when counts are not loaded', () => {
    expect(likeCount(null, 'tozeur')).toBe(0)
    expect(likeCount(undefined, 'tozeur')).toBe(0)
  })
})

describe('adjustCount', () => {
  it('adds and removes a like', () => {
    expect(adjustCount({ tozeur: 2 }, 'tozeur', 1)).toEqual({ tozeur: 3 })
    expect(adjustCount({ tozeur: 2 }, 'tozeur', -1)).toEqual({ tozeur: 1 })
    expect(adjustCount({}, 'tozeur', 1)).toEqual({ tozeur: 1 })
  })

  it('adds numerically after countsFromRows', () => {
    expect(adjustCount(countsFromRows([{ city_id: 'tozeur', likes: '2' }]), 'tozeur', 1)).toEqual({ tozeur: 3 })
  })

  it('never goes below 0', () => {
    expect(adjustCount({ tozeur: 0 }, 'tozeur', -1)).toEqual({ tozeur: 0 })
  })

  it('leaves other cities and the input untouched', () => {
    const counts = { tozeur: 2, tunis: 5 }
    expect(adjustCount(counts, 'tozeur', 1)).toEqual({ tozeur: 3, tunis: 5 })
    expect(counts).toEqual({ tozeur: 2, tunis: 5 })
  })
})

describe('toggleId', () => {
  it('adds an id once and removes it', () => {
    expect(toggleId(['tunis'], 'tozeur', true)).toEqual(['tunis', 'tozeur'])
    expect(toggleId(['tunis', 'tozeur'], 'tozeur', true)).toEqual(['tunis', 'tozeur'])
    expect(toggleId(['tunis', 'tozeur'], 'tozeur', false)).toEqual(['tunis'])
  })

  it('does not change the input', () => {
    const ids = ['tunis']
    toggleId(ids, 'tozeur', true)
    expect(ids).toEqual(['tunis'])
  })
})

describe('mostVisited', () => {
  const cities = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]

  it('orders by visits, highest first', () => {
    expect(mostVisited({ c: 5, a: 1, d: 3 }, cities, 3).map((c) => c.id)).toEqual(['c', 'd', 'a'])
  })

  it('keeps the list order for equal counts', () => {
    expect(mostVisited({ b: 2, d: 2 }, cities, 4).map((c) => c.id)).toEqual(['b', 'd', 'a', 'c'])
  })

  it('fills the remaining spots in list order', () => {
    expect(mostVisited({ d: 1 }, cities, 3).map((c) => c.id)).toEqual(['d', 'a', 'b'])
  })

  it('keeps the list order when nothing is counted', () => {
    expect(mostVisited({}, cities, 2).map((c) => c.id)).toEqual(['a', 'b'])
    expect(mostVisited(null, cities, 2).map((c) => c.id)).toEqual(['a', 'b'])
  })

  it('does not change the input list', () => {
    const list = [...cities]
    mostVisited({ d: 9 }, list, 4)
    expect(list).toEqual(cities)
  })
})
