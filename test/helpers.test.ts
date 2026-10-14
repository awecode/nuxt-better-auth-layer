import { describe, expect, it } from 'vitest'
import { getErrorMessage } from '../app/utils/helpers'

describe('getErrorMessage', () => {
  it('prefers the message nested on data', () => {
    expect(getErrorMessage({
      message: 'outer',
      data: { message: 'inner' },
    })).toBe('inner')
  })

  it('falls back to the top-level message', () => {
    expect(getErrorMessage(new Error('session expired'))).toBe('session expired')
  })

  it('stringifies values that have no message', () => {
    expect(getErrorMessage('nope')).toBe('nope')
    expect(getErrorMessage({})).toBe('[object Object]')
  })
})
