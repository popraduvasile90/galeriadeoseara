import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase admin client
vi.mock('@/lib/supabase', () => ({
  isSupabaseAdminConfigured: true,
  supabaseAdmin: {
    from: vi.fn(),
    rpc: vi.fn(),
    storage: {
      from: vi.fn()
    },
    auth: {
      getUser: vi.fn(),
      admin: {
        createUser: vi.fn(),
        deleteUser: vi.fn()
      }
    }
  }
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}))

import { getProfilUtilizator, inregistreazaUtilizatorAction } from '@/actions/user-actions'
import { adaugaTablou, actualizeazaTablou } from '@/actions/admin-actions'
import { supabaseAdmin } from '@/lib/supabase'

describe('Auth & Profile Security Extended Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ==========================================
  // 1. Profil Utilizator (getProfilUtilizator)
  // ==========================================
  describe('getProfilUtilizator', () => {
    it('✓ Returnează datele profilului pentru un token valid', async () => {
      vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValueOnce({
        data: { user: { id: 'usr-valid-123' } } as any,
        error: null
      })

      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: { id: 'usr-valid-123', nume: 'Alex Popa', telefon: '0712345678' },
        error: null
      })

      const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      vi.mocked(supabaseAdmin.from).mockReturnValue({ select: mockSelect } as any)

      const profile = await getProfilUtilizator('valid-token-xyz')

      expect(profile).not.toBeNull()
      expect(profile?.nume).toBe('Alex Popa')
      expect(profile?.telefon).toBe('0712345678')
    })

    it('❌ Returnează null dacă token-ul este invalid sau expirat', async () => {
      vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid JWT' } as any
      })

      const profile = await getProfilUtilizator('invalid-token')
      expect(profile).toBeNull()
    })

    it('❌ Returnează null dacă profilul nu există în tabela profile', async () => {
      vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValueOnce({
        data: { user: { id: 'usr-no-profile' } } as any,
        error: null
      })

      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Row not found' }
      })

      const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      vi.mocked(supabaseAdmin.from).mockReturnValue({ select: mockSelect } as any)

      const profile = await getProfilUtilizator('valid-token-no-profile')
      expect(profile).toBeNull()
    })
  })

  // ==========================================
  // 2. Extrema Preturi Admin (Preț Pornire > 15 cifre)
  // ==========================================
  describe('Limita Preturi Exagerate', () => {
    it('❌ Respinge adăugare tablou dacă prețul depășește 15 cifre (> 999999999999999)', async () => {
      const fd = new FormData()
      fd.append('titlu', 'Tablou Scump')
      fd.append('autor', 'Artist Millionaire')
      fd.append('codLot', 'LOT-BIG')
      fd.append('descriere', 'Descriere')
      fd.append('pretPornire', '1000000000000000') // 16 cifre
      fd.append('dataLimita', new Date(Date.now() + 86400000).toISOString())
      fd.append('imagine', new File(['img'], 'pic.jpg', { type: 'image/jpeg' }))

      const res = await adaugaTablou(fd)
      expect(res.success).toBe(false)
      expect(res.error).toContain('limita maximă permisă')
    })

    it('❌ Respinge actualizare tablou dacă prețul nou depășește 15 cifre', async () => {
      const fd = new FormData()
      fd.append('titlu', 'Tablou Update Scump')
      fd.append('autor', 'Artist')
      fd.append('codLot', 'LOT-BIG')
      fd.append('descriere', 'Descriere')
      fd.append('pretPornire', '9999999999999999') // 16 cifre
      fd.append('dataLimita', new Date(Date.now() + 86400000).toISOString())

      const res = await actualizeazaTablou('tablou-1', fd)
      expect(res.success).toBe(false)
      expect(res.error).toContain('limita maximă permisă')
    })
  })
})
