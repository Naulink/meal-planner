import { describe, it, expect } from 'vitest'
import { formatCookTime } from './utils'

describe('formatCookTime', () => {
  it('formats minutes only', () => {
    expect(formatCookTime(45)).toBe('45min')
    expect(formatCookTime(1)).toBe('1min')
  })

  it('formats exact hours', () => {
    expect(formatCookTime(60)).toBe('1h')
    expect(formatCookTime(120)).toBe('2h')
  })

  it('formats hours and minutes', () => {
    expect(formatCookTime(80)).toBe('1h20min')
    expect(formatCookTime(90)).toBe('1h30min')
  })
})
