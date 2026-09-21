'use client'

import { Tablou } from '@/types'
import { actualizeazaTablou } from '@/actions/admin-actions'

interface EditLotModalProps {
  selectedTablou: Tablou
  onClose: () => void
  onSuccess: () => void
}

export default function EditLotModal({ selectedTablou, onClose, onSuccess }: EditLotModalProps) {
  const getLocalNowString = () => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const formData = new FormData(e.currentTarget)
    const res = await actualizeazaTablou(selectedTablou.id, formData)
    
    if (res.success) {
      onSuccess()
    } else {
      alert(`Eroare la modificare: ${res.error}`)
    }
  }

  const getFormattedDate = () => {
    const d = new Date(selectedTablou.data_limita)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
  }

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="max-w-md w-full bg-white border border-stone-300 p-6 md:p-8 shadow-2xl rounded-none space-y-5 my-8">
        <h2 className="text-base font-serif uppercase tracking-wider text-stone-800 border-b border-stone-200 pb-2">
          Modificare Date Lot
        </h2>
        
        <form onSubmit={handleUpdate} className="space-y-4 text-xs tracking-wide">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-semibold uppercase text-stone-600">Titlu Lucrare</label>
              <input 
                type="text" 
                name="titlu" 
                defaultValue={selectedTablou.titlu} 
                required 
                className="w-full p-3 mt-1.5 bg-stone-50 border border-stone-300 focus:border-stone-500 focus:outline-none text-sm text-stone-800 rounded-none" 
              />
            </div>
            <div>
              <label className="block font-semibold uppercase text-stone-600">Cod Lot</label>
              <input 
                type="text" 
                name="codLot" 
                defaultValue={selectedTablou.cod_lot || ''} 
                placeholder="#0309"
                required
                className="w-full p-3 mt-1.5 bg-stone-50 border border-stone-300 focus:border-stone-500 focus:outline-none text-sm text-stone-800 rounded-none font-mono" 
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold uppercase text-stone-600">Artist / Autor</label>
            <input 
              type="text" 
              name="autor" 
              defaultValue={selectedTablou.autor} 
              required 
              className="w-full p-3 mt-1.5 bg-stone-50 border border-stone-300 focus:border-stone-500 focus:outline-none text-sm text-stone-800 rounded-none" 
            />
          </div>
          <div>
            <div className="flex justify-between items-baseline">
              <label className="block font-semibold uppercase text-stone-600">Tehnică & Descriere</label>
              <span className="text-[10px] text-stone-400">Max 1000 caractere</span>
            </div>
            <textarea 
              name="descriere" 
              rows={4} 
              maxLength={1000}
              defaultValue={selectedTablou.descriere || ''} 
              className="w-full p-3 mt-1.5 bg-stone-50 border border-stone-300 focus:border-stone-500 focus:outline-none text-sm text-stone-800 rounded-none leading-relaxed resize-y" 
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold uppercase text-stone-600">Preț Curent (RON)</label>
              <input 
                type="number" 
                name="pretPornire" 
                min="1" 
                max="999999999999999"
                defaultValue={selectedTablou.pret_curent} 
                required 
                className="w-full p-3 mt-1.5 bg-stone-50 border border-stone-300 focus:border-stone-500 focus:outline-none text-sm font-mono text-stone-800 rounded-none" 
              />
            </div>
            <div>
              <label className="block font-semibold uppercase text-stone-600">Dată Încheiere</label>
              <input 
                type="datetime-local" 
                name="dataLimita" 
                min={getLocalNowString()}
                defaultValue={getFormattedDate()} 
                required 
                className="w-full p-3 mt-1.5 bg-stone-50 border border-stone-300 focus:border-stone-500 focus:outline-none text-sm text-stone-800 rounded-none" 
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-5 border-t border-stone-200">
            <button 
              type="button" 
              onClick={onClose} 
              className="border border-stone-400 bg-white hover:bg-stone-50 text-stone-700 px-4 py-2.5 font-serif text-xs uppercase tracking-wider rounded-none transition cursor-pointer"
            >
              Anulează
            </button>
            <button 
              type="submit" 
              className="bg-[#7a1c1c] hover:bg-[#5f1515] text-white px-4 py-2.5 font-serif text-xs uppercase tracking-wider font-bold rounded-none transition shadow-sm cursor-pointer"
            >
              Salvează Modificările
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
