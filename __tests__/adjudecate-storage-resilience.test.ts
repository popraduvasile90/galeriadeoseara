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

import { getTablouriAdjudecate, stergeTablou } from '@/actions/admin-actions'
import { supabaseAdmin } from '@/lib/supabase'

describe('Tablouri Adjudecate & Storage Resilience Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ==========================================
  // 1. Licitatii Incheiate / Adjudecate
  // ==========================================
  describe('getTablouriAdjudecate', () => {
    it('✓ Returnează doar tablourile expirate cu ofertele lor sortate descrescător', async () => {
      const mockAdjudecate = [
        {
          id: 'adj-1',
          titlu: 'Tablou Adjudecat 1',
          data_limita: '2025-01-01T00:00:00Z',
          oferte: [
            { id: 'o1', suma: 300 },
            { id: 'o2', suma: 800 },
            { id: 'o3', suma: 500 }
          ]
        }
      ]

      const mockLte = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValueOnce({
          data: mockAdjudecate,
          error: null
        })
      })

      const mockSelect = vi.fn().mockReturnValue({
        lte: mockLte
      })

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: mockSelect
      } as any)

      const result = await getTablouriAdjudecate()

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('adj-1')
      expect(result[0].oferte![0].suma).toBe(800)
      expect(result[0].oferte![1].suma).toBe(500)
      expect(result[0].oferte![2].suma).toBe(300)
    })

    it('✓ Populează oferte ca tablou gol [] dacă tabloul nu are nicio ofertă', async () => {
      const mockAdjudecateFaraOferte = [
        {
          id: 'adj-2',
          titlu: 'Fără oferte',
          data_limita: '2025-01-01T00:00:00Z',
          oferte: null
        }
      ]

      const mockLte = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValueOnce({
          data: mockAdjudecateFaraOferte,
          error: null
        })
      })

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({ lte: mockLte })
      } as any)

      const result = await getTablouriAdjudecate()
      expect(result[0].oferte).toEqual([])
    })

    it('❌ Returnează tablou gol [] și nu aruncă excepție neprinsă la eroare DB', async () => {
      const mockLte = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Database connection error' }
        })
      })

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({ lte: mockLte })
      } as any)

      const result = await getTablouriAdjudecate()
      expect(result).toEqual([])
    })
  })

  // ==========================================
  // 2. Ștergere Tablou & Storage Cleanup
  // ==========================================
  describe('stergeTablou', () => {
    it('✓ Extras corect nume fișier din URL imagine și ștergere atât din storage cât și din DB', async () => {
      const mockRemove = vi.fn().mockResolvedValueOnce({ error: null })
      vi.mocked(supabaseAdmin.storage.from).mockReturnValue({
        remove: mockRemove
      } as any)

      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValueOnce({ error: null })
      })
      vi.mocked(supabaseAdmin.from).mockReturnValue({
        delete: mockDelete
      } as any)

      const res = await stergeTablou('tablou-id-99', 'https://supabase.co/storage/v1/object/public/imagini-tablouri/abc-123.jpg')

      expect(res.success).toBe(true)
      expect(mockRemove).toHaveBeenCalledWith(['abc-123.jpg'])
      expect(mockDelete).toHaveBeenCalled()
    })

    it('❌ Gestionează eroarea când ștergerea din DB eșuează', async () => {
      vi.mocked(supabaseAdmin.storage.from).mockReturnValue({
        remove: vi.fn().mockResolvedValueOnce({ error: null })
      } as any)

      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValueOnce({ error: { message: 'Foreign key constraint' } })
      })
      vi.mocked(supabaseAdmin.from).mockReturnValue({
        delete: mockDelete
      } as any)

      const res = await stergeTablou('tablou-id-99', 'https://supabase.co/storage/v1/object/public/imagini-tablouri/abc-123.jpg')

      expect(res.success).toBe(false)
      expect(res.error).toContain('Foreign key constraint')
    })
  })
})
