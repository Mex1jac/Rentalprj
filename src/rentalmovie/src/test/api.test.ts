import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, fetcher } from '../api'

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetcher', () => {
  it('returns parsed JSON on success', async () => {
    const payload = [{ staffId: 1 }]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(payload)))

    const result = await fetcher<typeof payload>('/api/staff')

    expect(result).toEqual(payload)
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:5174/api/staff',
      expect.objectContaining({ headers: expect.objectContaining({ 'Content-Type': 'application/json' }) }),
    )
  })

  it('throws ApiError with the server message on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: 'Username is already in use.' }, 409)),
    )

    const error = await fetcher('/api/staff').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 409, message: 'Username is already in use.' })
  })

  it('falls back to a generic message when the body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('not json')
        },
      } as unknown as Response),
    )

    const error = await fetcher('/api/staff').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).message).toBe('Request failed with status 500')
  })

  it('resolves undefined on 204 No Content', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(null, 204)))

    await expect(fetcher('/api/staff/1/password')).resolves.toBeUndefined()
  })
})
