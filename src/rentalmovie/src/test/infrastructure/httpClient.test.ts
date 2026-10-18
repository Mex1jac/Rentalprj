import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api } from '../../infrastructure/http/httpClient'

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

describe('httpClient', () => {
  it('get returns parsed JSON with JSON headers', async () => {
    const payload = [{ staffId: 1 }]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(payload)))

    const result = await api.get<typeof payload>('/api/staff')

    expect(result).toEqual(payload)
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:5174/api/staff',
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    )
  })

  it('throws ApiError with the server message on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: 'Username is already in use.' }, 409)),
    )

    const error = await api.get('/api/staff').catch((e: unknown) => e)

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

    const error = await api.get('/api/staff').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).message).toBe('Request failed with status 500')
  })

  it('put resolves undefined on 204 No Content', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(null, 204))
    vi.stubGlobal('fetch', fetchMock)

    await expect(api.put('/api/staff/1/password', { newPassword: 'secret123' })).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5174/api/staff/1/password',
      expect.objectContaining({ method: 'PUT' }),
    )
  })
})
