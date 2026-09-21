import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase admin client and helper functions
vi.mock('@/lib/supabase', () => {
  return {
    isSupabaseAdminConfigured: true,
    supabaseAdmin: {
      from: vi.fn(),
      rpc: vi.fn(),
      auth: {
        admin: {
          createUser: vi.fn(),
          deleteUser: vi.fn()
        },
        getUser: vi.fn()
      }
    }
  }
})

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}))

import { 
  inregistreazaUtilizatorAction, 
  plaseazaOfertaAction, 
  getTablouriActive, 
  getTablouCuOferte,
  getProfilUtilizator 
} from '@/actions/user-actions'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase'

describe('User Actions - Unit & Edge Case Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ==========================================
  // 1. Înregistrare Utilizator (Auth & Validation)
  // ==========================================
  describe('inregistreazaUtilizatorAction', () => {
    it('✓ Caz Normal: Înregistrare cu date valide (nume, email, parolă >= 6)', async () => {
      vi.mocked(supabaseAdmin.auth.admin.createUser).mockResolvedValueOnce({
        data: { user: { id: 'user-uuid-123' } } as any,
        error: null
      })

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValueOnce({ error: null })
      })
      vi.mocked(supabaseAdmin.from).mockImplementation(mockFrom as any)

      const result = await inregistreazaUtilizatorAction('Ion Popescu', 'ion@exemplu.ro', 'parola123')
      expect(result.success).toBe(true)
      expect(supabaseAdmin.auth.admin.createUser).toHaveBeenCalledWith({
        email: 'ion@exemplu.ro',
        password: 'parola123',
        email_confirm: true
      })
    })

    it('❌ Excepție: Nume gol sau doar spații albe', async () => {
      const res = await inregistreazaUtilizatorAction('   ', 'ion@exemplu.ro', 'parola123')
      expect(res.success).toBe(false)
      expect(res.error).toContain('Toate câmpurile')
    })

    it('❌ Excepție: Email gol', async () => {
      const res = await inregistreazaUtilizatorAction('Ion Popescu', '  ', 'parola123')
      expect(res.success).toBe(false)
      expect(res.error).toContain('Toate câmpurile')
    })

    it('❌ Excepție: Parolă prea scurtă (< 6 caractere)', async () => {
      const res = await inregistreazaUtilizatorAction('Ion Popescu', 'ion@exemplu.ro', '12345')
      expect(res.success).toBe(false)
      expect(res.error).toContain('cel puțin 6 caractere')
    })

    it('❌ Excepție: Parolă goală', async () => {
      const res = await inregistreazaUtilizatorAction('Ion Popescu', 'ion@exemplu.ro', '')
      expect(res.success).toBe(false)
      expect(res.error).toContain('Toate câmpurile')
    })

    it('✓ Curățare date: Trimmare spații albe la email și conversie la minuscule', async () => {
      vi.mocked(supabaseAdmin.auth.admin.createUser).mockResolvedValueOnce({
        data: { user: { id: 'user-uuid-456' } } as any,
        error: null
      })

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValueOnce({ error: null })
      })
      vi.mocked(supabaseAdmin.from).mockImplementation(mockFrom as any)

      await inregistreazaUtilizatorAction('   Maria Ionescu   ', '  MARIA@TEST.RO  ', 'parolaSecura')
      expect(supabaseAdmin.auth.admin.createUser).toHaveBeenCalledWith({
        email: 'maria@test.ro',
        password: 'parolaSecura',
        email_confirm: true
      })
    })

    it('❌ Excepție Supabase: Rollback (ștergere user auth) dacă salvarea profilului eșuează', async () => {
      vi.mocked(supabaseAdmin.auth.admin.createUser).mockResolvedValueOnce({
        data: { user: { id: 'user-uuid-error' } } as any,
        error: null
      })

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValueOnce({ error: { message: 'DB Error Profile' } })
      })
      vi.mocked(supabaseAdmin.from).mockImplementation(mockFrom as any)
      vi.mocked(supabaseAdmin.auth.admin.deleteUser).mockResolvedValueOnce({ error: null } as any)

      const res = await inregistreazaUtilizatorAction('Test User', 'test@error.ro', 'parola123')
      expect(res.success).toBe(false)
      expect(res.error).toContain('Eroare la salvarea profilului')
      expect(supabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith('user-uuid-error')
    })
  })

  // ==========================================
  // 2. Plasare Ofertă / Licitare (Bidding Logic)
  // ==========================================
  describe('plaseazaOfertaAction', () => {
    it('✓ Caz Normal: Ofertă validă (sumă mai mare decat preț curent, pas de 50)', async () => {
      vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValueOnce({
        data: { user: { id: 'user-123' } } as any,
        error: null
      })

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValueOnce({
            data: { pret_pornire: 500, pret_curent: 600 },
            error: null
          })
        })
      })

      const mockOferteSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValueOnce({ data: null, error: null })
              })
            })
          })
        })
      })

      const mockFrom = vi.fn((table) => {
        if (table === 'tablouri') return { select: mockSelect }
        if (table === 'oferte') return { select: mockOferteSelect }
        return {}
      })
      vi.mocked(supabaseAdmin.from).mockImplementation(mockFrom as any)

      vi.mocked(supabaseAdmin.rpc).mockResolvedValueOnce({
        data: { success: true, new_price: 650 },
        error: null
      })

      const res = await plaseazaOfertaAction('tablou-1', 'valid-access-token', 650)
      expect(res.success).toBe(true)
      expect(res.newPrice).toBe(650)
    })

    it('❌ Excepție: Sumă negativă sau zero', async () => {
      const res1 = await plaseazaOfertaAction('tablou-1', 'valid-token', 0)
      expect(res1.success).toBe(false)
      expect(res1.error).toContain('pozitivă')

      const res2 = await plaseazaOfertaAction('tablou-1', 'valid-token', -100)
      expect(res2.success).toBe(false)
      expect(res2.error).toContain('pozitivă')
    })

    it('❌ Excepție: Sumă care nu respectă pasul de 50 RON peste prețul de pornire', async () => {
      vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValueOnce({
        data: { user: { id: 'user-123' } } as any,
        error: null
      })

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValueOnce({
            data: { pret_pornire: 500, pret_curent: 500 },
            error: null
          })
        })
      })
      vi.mocked(supabaseAdmin.from).mockImplementation(() => ({ select: mockSelect }) as any)

      // 530 - 500 = 30 (nu este multiplu de 50)
      const res = await plaseazaOfertaAction('tablou-1', 'valid-token', 530)
      expect(res.success).toBe(false)
      expect(res.error).toContain('pas de exact 50 RON')
    })

    it('❌ Excepție: Sumă mai mică sau egală cu prețul curent', async () => {
      vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValueOnce({
        data: { user: { id: 'user-123' } } as any,
        error: null
      })

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValueOnce({
            data: { pret_pornire: 500, pret_curent: 700 },
            error: null
          })
        })
      })
      vi.mocked(supabaseAdmin.from).mockImplementation(() => ({ select: mockSelect }) as any)

      // Încearcă 650 RON când prețul curent este 700 RON
      const res = await plaseazaOfertaAction('tablou-1', 'valid-token', 650)
      expect(res.success).toBe(false)
      expect(res.error).toContain('mai mare decât prețul curent')
    })

    it('❌ Excepție: Utilizator neautentificat (Token invalid sau lipsă)', async () => {
      vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid token' } as any
      })

      const res = await plaseazaOfertaAction('tablou-1', 'invalid-token', 600)
      expect(res.success).toBe(false)
      expect(res.error).toContain('autentificat')
    })

    it('❌ Excepție: Tablou inexistent', async () => {
      vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValueOnce({
        data: { user: { id: 'user-123' } } as any,
        error: null
      })

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValueOnce({
            data: null,
            error: { message: 'Not found' }
          })
        })
      })
      vi.mocked(supabaseAdmin.from).mockImplementation(() => ({ select: mockSelect }) as any)

      const res = await plaseazaOfertaAction('tablou-inexistent', 'valid-token', 600)
      expect(res.success).toBe(false)
      expect(res.error).toContain('nu a fost găsit')
    })
  })

  // ==========================================
  // 3. Ordonare & Sortare Oferte (Sorting Logic)
  // ==========================================
  describe('getTablouriActive & Sortare', () => {
    it('✓ Caz Normal: Sortare oferte în ordine descrescătoare după sumă', async () => {
      const mockOrder = vi.fn().mockResolvedValueOnce({
        data: [
          {
            id: 't1',
            titlu: 'Tablou Test',
            oferte: [
              { id: 1, suma: 200 },
              { id: 2, suma: 500 },
              { id: 3, suma: 350 }
            ]
          }
        ],
        error: null
      })

      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })
      vi.mocked(supabaseAdmin.from).mockImplementation(() => ({ select: mockSelect }) as any)

      const result = await getTablouriActive()
      expect(result.length).toBe(1)
      expect(result[0].oferte![0].suma).toBe(500)
      expect(result[0].oferte![1].suma).toBe(350)
      expect(result[0].oferte![2].suma).toBe(200)
    })

    it('✓ Edge Case: Tablou fără nicio ofertă (oferte null/undefined)', async () => {
      const mockOrder = vi.fn().mockResolvedValueOnce({
        data: [
          {
            id: 't2',
            titlu: 'Fără oferte',
            oferte: null
          }
        ],
        error: null
      })

      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })
      vi.mocked(supabaseAdmin.from).mockImplementation(() => ({ select: mockSelect }) as any)

      const result = await getTablouriActive()
      expect(result.length).toBe(1)
      expect(result[0].oferte).toEqual([])
    })
  })
})
