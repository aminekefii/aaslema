import { describe, expect, it } from 'vitest'
import { cities, cityNeighbours } from './cities.js'

describe('cityNeighbours', () => {
  it('gives the cities before and after in the list', () => {
    expect(cityNeighbours(cities[1].id)).toEqual({ prev: cities[0], next: cities[2] })
  })

  it('goes from the first city back to the last', () => {
    expect(cityNeighbours(cities[0].id).prev).toBe(cities.at(-1))
  })

  it('goes from the last city on to the first', () => {
    expect(cityNeighbours(cities.at(-1).id).next).toBe(cities[0])
  })
})
