'use client'

import { useState, useRef } from 'react'
import { adaugaTablou } from '@/actions/admin-actions'

interface LotFormProps {
  onSuccess: () => void
}

export default function LotForm({ onSuccess }: LotFormProps) {
  const [loading, setLoading] = useState(false)
  const [mesaj, setMesaj] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  const getLocalNowString = () => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!formRef.current) return

    setLoading(true)
    setMesaj('')

    const formData = new FormData(formRef.current)
    const res = await adaugaTablou(formData)
    
    setLoading(false)

    if (res.success) {
      setMesaj('✅ Piesa de artă a fost adăugată cu succes în catalog.')
      formRef.current.reset()
      onSuccess()
    } else {
      setMesaj(`❌ Eroare: ${res.error}`)
    }
  }

  return (
    <div className="bg-white border border-stone-200 p-6 md:p-8 shadow-sm rounded-none w-full">
      <h2 className="text-lg font-serif uppercase tracking-wider text-stone-800 border-b border-stone-100 pb-3 mb-6">
        Fișă Produs Nou
      </h2>
      
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-5 text-xs tracking-wide">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block font-semibold uppercase text-stone-600">Titlu Lucrare</label>
            <input 
              type="text" 
              name="titlu" 
              required 
              className="w-full p-3 mt-1.5 bg-stone-50 border border-stone-300 focus:border-stone-500 focus:outline-none rounded-none text-sm text-stone-800" 
            />
          </div>
          <div>
            <label className="block font-semibold uppercase text-stone-600">Cod Lot</label>
            <input 
              type="text" 
              name="codLot" 
              placeholder="#0309"
              required
              className="w-full p-3 mt-1.5 bg-stone-50 border border-stone-300 focus:border-stone-500 focus:outline-none rounded-none text-sm text-stone-800 font-mono" 
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold uppercase text-stone-600">Artist / Autor</label>
          <input 
            type="text" 
            name="autor" 
            required 
            className="w-full p-3 mt-1.5 bg-stone-50 border border-stone-300 focus:border-stone-500 focus:outline-none rounded-none text-sm text-stone-800" 
          />
        </div>

        <div>
          <div className="flex justify-between items-baseline">
            <label className="block font-semibold uppercase text-stone-600">Tehnică, Dimensiuni și Detalii</label>
            <span className="text-[10px] text-stone-400">Max 1000 caractere</span>
          </div>
          <textarea 
            name="descriere" 
            rows={4} 
            maxLength={1000}
            className="w-full p-3 mt-1.5 bg-stone-50 border border-stone-300 focus:border-stone-500 focus:outline-none rounded-none text-sm text-stone-800 leading-relaxed resize-y" 
            placeholder="Ex: ulei pe pânză, 50x70 cm, semnat dreapta jos..." 
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold uppercase text-stone-600">Preț Pornire (RON)</label>
            <input 
              type="number" 
              name="pretPornire" 
              min="1" 
              max="999999999999999"
              required 
              className="w-full p-3 mt-1.5 bg-stone-50 border border-stone-300 focus:border-stone-500 focus:outline-none rounded-none text-sm font-mono text-stone-800" 
            />
          </div>
          <div>
            <label className="block font-semibold uppercase text-stone-600">Dată Încheiere</label>
            <input 
              type="datetime-local" 
              name="dataLimita" 
              min={getLocalNowString()}
              required 
              className="w-full p-3 mt-1.5 bg-stone-50 border border-stone-300 focus:border-stone-500 focus:outline-none rounded-none text-sm text-stone-800" 
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold uppercase text-stone-600">Fotografie Lucrare</label>
          <input 
            type="file" 
            name="imagine" 
            accept="image/*" 
            required 
            className="w-full text-xs text-stone-500 mt-2 file:mr-3 file:py-2 file:px-4 file:rounded-none file:border file:border-stone-400 file:bg-white file:text-stone-700 hover:file:bg-stone-50 cursor-pointer" 
          />
        </div>

        <button 
          type="submit" 
          disabled={loading} 
          className="w-full bg-[#7a1c1c] hover:bg-[#5f1515] text-white p-3.5 uppercase font-serif tracking-widest font-bold transition-all disabled:opacity-50 rounded-none shadow-sm cursor-pointer text-xs"
        >
          {loading ? 'Se înregistrează...' : 'Adaugă în Licitație'}
        </button>
      </form>

      {mesaj && (
        <p className="mt-4 text-center text-xs font-serif italic p-2 bg-stone-50 border border-stone-200 text-stone-700">
          {mesaj}
        </p>
      )}
    </div>
  )
}
