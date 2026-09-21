import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase admin client and helper functions
vi.mock('@/lib/supabase', () => {
  return {
    isSupabaseAdminConfigured: true,
    supabaseAdmin: {
      from: vi.fn(),
      storage: {
        from: vi.fn()
      }
    }
  }
})

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}))

import { adaugaTablou, actualizeazaTablou, stergeTablou, getTablouri, getTablouriAdjudecate } from '@/actions/admin-actions'
import { supabaseAdmin } from '@/lib/supabase'

describe('Admin Actions - Edge Cases & Validation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Helper pentru a crea un obiect FormData mock valid
  function buildValidFormData() {
    const fd = new FormData()
    fd.append('titlu', 'Natură Statică')
    fd.append('autor', 'Vasile Pop')
    fd.append('codLot', 'LOT-100')
    fd.append('descriere', 'Pictură în ulei pe pânză 50x70cm.')
    fd.append('pretPornire', '300')
    // Dată în viitor (peste 3 zile)
    const futureDate = new Date(Date.now() + 86400000 * 3).toISOString()
    fd.append('dataLimita', futureDate)
    
    // File mock
    const fakeFile = new File(['fake content'], 'test.jpg', { type: 'image/jpeg' })
    fd.append('imagine', fakeFile)
    return fd
  }

  // ==========================================
  // 1. Adăugare Tablou (Validation & Edge Cases)
  // ==========================================
  describe('adaugaTablou', () => {
    it('✓ Caz Normal: Adăugare lot cu toate datele valide', async () => {
      vi.mocked(supabaseAdmin.storage.from).mockReturnValue({
        upload: vi.fn().mockResolvedValueOnce({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://storage/test.jpg' } })
      } as any)

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        insert: vi.fn().mockResolvedValueOnce({ error: null })
      } as any)

      const fd = buildValidFormData()
      const res = await adaugaTablou(fd)
      expect(res.success).toBe(true)
    })

    it('❌ Excepție: Cod lot lipsă sau format doar din spații albe', async () => {
      const fd = buildValidFormData()
      fd.set('codLot', '   ')
      const res = await adaugaTablou(fd)
      expect(res.success).toBe(false)
      expect(res.error).toContain('Codul lotului este obligatoriu')
    })

    it('❌ Excepție: Preț de pornire <= 0 sau invalid (NaN)', async () => {
      const fd = buildValidFormData()
      fd.set('pretPornire', '-50')
      const res1 = await adaugaTablou(fd)
      expect(res1.success).toBe(false)
      expect(res1.error).toContain('pozitiv mai mare ca 0')

      fd.set('pretPornire', 'abc')
      const res2 = await adaugaTablou(fd)
      expect(res2.success).toBe(false)
      expect(res2.error).toContain('pozitiv mai mare ca 0')
    })

    it('❌ Excepție: Preț de pornire uriaș (peste 15 cifre / 999999999999999)', async () => {
      const fd = buildValidFormData()
      fd.set('pretPornire', '10000000000000000') // 16 cifre
      const res = await adaugaTablou(fd)
      expect(res.success).toBe(false)
      expect(res.error).toContain('limita maximă permisă')
    })

    it('❌ Excepție: Descriere prea lungă (> 1000 caractere)', async () => {
      const fd = buildValidFormData()
      const longText = 'A'.repeat(1001)
      fd.set('descriere', longText)
      const res = await adaugaTablou(fd)
      expect(res.success).toBe(false)
      expect(res.error).toContain('1000 de caractere')
    })

    it('❌ Excepție: Data de încheiere este în trecut sau invalidă', async () => {
      const fd = buildValidFormData()
      const pastDate = new Date(Date.now() - 86400000).toISOString() // Ieri
      fd.set('dataLimita', pastDate)
      const res = await adaugaTablou(fd)
      expect(res.success).toBe(false)
      expect(res.error).toContain('în viitor')
    })

    it('❌ Excepție: Fișier imagine lipsă sau fișier cu 0 bytes', async () => {
      const fd = buildValidFormData()
      const emptyFile = new File([], 'empty.jpg', { type: 'image/jpeg' })
      fd.set('imagine', emptyFile)
      const res = await adaugaTablou(fd)
      expect(res.success).toBe(false)
      expect(res.error).toContain('Imaginea tabloului este obligatorie')
    })
  })

  // ==========================================
  // 2. Actualizare Tablou & Resetare Oferte
  // ==========================================
  describe('actualizeazaTablou', () => {
    it('✓ Conflicte & Resetare: Modificarea prețului resetează istoricul ofertelor vechi', async () => {
      const fd = buildValidFormData()
      fd.set('pretPornire', '450') // Modificăm de la 300 la 450

      const mockDelete = vi.fn().mockResolvedValueOnce({ error: null })
      const mockUpdate = vi.fn().mockResolvedValueOnce({ error: null })

      const mockFrom = vi.fn((table) => {
        if (table === 'tablouri') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValueOnce({
                  data: { pret_pornire: 300, pret_curent: 300 },
                  error: null
                })
              })
            }),
            update: vi.fn().mockReturnValue({
              eq: mockUpdate
            })
          }
        }
        if (table === 'oferte') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: mockDelete
            })
          }
        }
        return {}
      })

      vi.mocked(supabaseAdmin.from).mockImplementation(mockFrom as any)

      const res = await actualizeazaTablou('tablou-uuid-1', fd)
      expect(res.success).toBe(true)
      expect(mockDelete).toHaveBeenCalledWith('tablou_id', 'tablou-uuid-1')
    })

    it('✓ Păstrare Oferte: Dacă prețul nu s-a schimbat, ofertele nu se șterg', async () => {
      const fd = buildValidFormData()
      fd.set('pretPornire', '500')

      const mockDelete = vi.fn()
      const mockUpdate = vi.fn().mockResolvedValueOnce({ error: null })

      const mockFrom = vi.fn((table) => {
        if (table === 'tablouri') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValueOnce({
                  data: { pret_pornire: 500, pret_curent: 500 },
                  error: null
                })
              })
            }),
            update: vi.fn().mockReturnValue({
              eq: mockUpdate
            })
          }
        }
        if (table === 'oferte') {
          return { delete: mockDelete }
        }
        return {}
      })

      vi.mocked(supabaseAdmin.from).mockImplementation(mockFrom as any)

      const res = await actualizeazaTablou('tablou-uuid-2', fd)
      expect(res.success).toBe(true)
      expect(mockDelete).not.toHaveBeenCalled()
    })
  })

  // ==========================================
  // 3. Ștergere Tablou & Storage Cleanup
  // ==========================================
  describe('stergeTablou', () => {
    it('✓ Ștergere completă: Elimină fișierul din Storage și rândul din baza de date', async () => {
      const mockRemove = vi.fn().mockResolvedValueOnce({ error: null })
      vi.mocked(supabaseAdmin.storage.from).mockReturnValue({
        remove: mockRemove
      } as any)

      const mockDeleteEq = vi.fn().mockResolvedValueOnce({ error: null })
      vi.mocked(supabaseAdmin.from).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: mockDeleteEq
        })
      } as any)

      const res = await stergeTablou('tablou-uuid-99', 'https://storage/imagini-tablouri/photo123.jpg')
      expect(res.success).toBe(true)
      expect(mockRemove).toHaveBeenCalledWith(['photo123.jpg'])
      expect(mockDeleteEq).toHaveBeenCalledWith('id', 'tablou-uuid-99')
    })
  })
})
