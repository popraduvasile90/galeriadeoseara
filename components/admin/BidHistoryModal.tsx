'use client'

import { Tablou } from '@/types'

interface BidHistoryModalProps {
  tablou: Tablou
  onClose: () => void
}

export default function BidHistoryModal({ tablou, onClose }: BidHistoryModalProps) {
  const oferte = tablou.oferte || []

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="max-w-2xl w-full bg-white border border-stone-300 p-6 md:p-8 shadow-2xl rounded-none space-y-6 my-8">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-stone-200 pb-3">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold block">
              Istoric complet oferte
            </span>
            <h3 className="font-serif text-lg font-bold text-stone-850">
              {tablou.titlu} {tablou.cod_lot && <span className="font-mono text-xs border border-stone-300 px-2 py-0.5 bg-stone-50 text-stone-600 rounded-none ml-1 inline-block">{tablou.cod_lot}</span>}
            </h3>
            <p className="text-[11px] text-stone-500 font-serif italic mt-0.5">
              Artist: {tablou.autor} • Preț de pornire: {tablou.pret_pornire} RON
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-stone-400 hover:text-stone-700 text-lg font-bold leading-none cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Table */}
        <div className="max-h-[350px] overflow-y-auto pr-1">
          {oferte.length === 0 ? (
            <p className="text-stone-400 font-serif italic text-sm text-center py-12">
              Nu s-a înregistrat nicio ofertă de preț pentru acest lot.
            </p>
          ) : (
            <table className="w-full text-xs text-stone-600 text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-300 text-[10px] uppercase text-stone-400 font-semibold">
                  <th className="py-2.5 px-3">Poz</th>
                  <th className="py-2.5 px-3">Nume Participant</th>
                  <th className="py-2.5 px-3">Număr Telefon</th>
                  <th className="py-2.5 px-3 text-right">Sumă Oferită</th>
                  <th className="py-2.5 px-3 text-right">Dată & Oră</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {oferte.map((of, idx) => (
                  <tr key={of.id} className="hover:bg-stone-50 font-sans">
                    <td className="py-3 px-3 font-bold text-stone-800">{idx + 1}</td>
                    <td className="py-3 px-3 font-semibold text-stone-900">{of.nume_utilizator}</td>
                    <td className="py-3 px-3 font-mono text-stone-600">{of.telefon}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#7a1c1c]">{of.suma} RON</td>
                    <td className="py-3 px-3 text-right text-stone-450 text-[10px]">
                      {new Date(of.created_at).toLocaleString('ro-RO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-stone-200">
          <button 
            onClick={onClose} 
            className="border border-stone-400 bg-white hover:bg-stone-50 text-stone-700 px-6 py-2.5 font-serif text-xs uppercase tracking-wider rounded-none transition cursor-pointer"
          >
            Închide
          </button>
        </div>

      </div>
    </div>
  )
}
