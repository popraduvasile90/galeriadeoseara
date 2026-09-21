'use client'

import { Tablou } from '@/types'
import { stergeTablou } from '@/actions/admin-actions'

interface LotListProps {
  tablouri: Tablou[]
  onEditClick: (tablou: Tablou) => void
  onDeleteSuccess: () => void
  onViewBids: (tablou: Tablou) => void
  onZoomImage?: (url: string, title: string) => void
}

export default function LotList({ tablouri, onEditClick, onDeleteSuccess, onViewBids, onZoomImage }: LotListProps) {
  async function handleDelete(id: string, imagineUrl: string) {
    if (confirm('Sigur doriți să eliminați această operă din catalogul galeriei?')) {
      const res = await stergeTablou(id, imagineUrl)
      if (res.success) {
        onDeleteSuccess()
      } else {
        alert(`Eroare la eliminare: ${res.error}`)
      }
    }
  }

  return (
    <div className="lg:col-span-2 bg-white border border-stone-200 p-6 md:p-8 shadow-sm rounded-none">
      <h2 className="text-xl font-serif uppercase tracking-wider text-stone-800 border-b border-stone-100 pb-3 mb-6">
        Loturi în Curs de Licitație
      </h2>
      
      {tablouri.length === 0 ? (
        <p className="text-stone-400 font-serif italic text-sm">
          Momentan nu există loturi înregistrate.
        </p>
      ) : (
        <div className="space-y-6">
          {tablouri.map((t) => (
            <div 
              key={t.id} 
              className="flex flex-col md:flex-row items-stretch justify-between p-6 md:p-8 border border-stone-200 bg-[#faf9f6] gap-6 hover:border-stone-400 transition-all"
            >
              {/* Product Info Section */}
              <div className="flex flex-col sm:flex-row items-start gap-6 flex-1">
                <div 
                  onClick={() => onZoomImage?.(t.imagine_url, t.titlu)}
                  className="relative w-full sm:w-32 h-48 sm:h-32 bg-white border border-stone-200 cursor-zoom-in group shrink-0"
                >
                  <img 
                    src={t.imagine_url} 
                    alt={t.titlu} 
                    className="w-full h-full object-cover p-1 transition-transform duration-350 group-hover:scale-105" 
                  />
                  <div className="absolute bottom-1.5 right-1.5 bg-white/90 hover:bg-white text-stone-800 p-1 shadow-sm border border-stone-200/80 transition-all duration-300 transform group-hover:scale-110 flex items-center justify-center z-10">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3 text-[#7a1c1c]">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 8.5v4m2-2h-4" />
                    </svg>
                  </div>
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {t.cod_lot && (
                      <span className="font-mono text-xs border border-stone-300 px-2 py-0.5 bg-stone-50 text-stone-600 rounded-none font-bold shrink-0">
                        {t.cod_lot}
                      </span>
                    )}
                    <h3 className="font-serif text-lg font-bold text-stone-800 leading-tight">
                      {t.titlu}
                    </h3>
                  </div>
                  <p className="text-xs text-stone-500 font-serif italic">
                    Autor: <span className="text-stone-700 font-sans font-semibold not-italic">{t.autor}</span>
                  </p>
                  {t.descriere && (
                    <p className="text-xs text-stone-600 leading-relaxed max-w-xl whitespace-pre-wrap">
                      {t.descriere}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Actions & Price Section */}
              <div className="flex flex-col items-start md:items-end justify-center border-t md:border-t-0 border-stone-200 pt-4 md:pt-0 gap-4 shrink-0 w-full md:w-auto">
                <div className="space-y-1 w-full text-left md:text-right">
                  <span className="text-[10px] uppercase tracking-wider text-stone-400 block">Preț curent</span>
                  <span className="font-mono text-base font-bold text-[#7a1c1c] block whitespace-nowrap">
                    {t.pret_curent} RON
                  </span>
                  <span className="text-[10px] text-stone-400 block font-sans whitespace-nowrap">
                    Limită: {new Date(t.data_limita).toLocaleString('ro-RO')}
                  </span>
                  
                  {/* Bids Counter / View history link */}
                  {t.oferte && (
                    <button
                      onClick={() => onViewBids(t)}
                      className="text-stone-500 hover:text-stone-850 text-[10px] font-semibold underline underline-offset-2 cursor-pointer mt-1 block w-full md:text-right"
                    >
                      {t.oferte.length} {t.oferte.length === 1 ? 'ofertă înregistrată' : 'oferte înregistrate'}
                    </button>
                  )}
                </div>
                
                <div className="flex items-center gap-4 mt-1">
                  <button 
                    onClick={() => onEditClick(t)} 
                    className="text-stone-600 hover:text-stone-950 text-xs font-semibold underline underline-offset-2 cursor-pointer"
                  >
                    Modifică
                  </button>
                  <button 
                    onClick={() => handleDelete(t.id, t.imagine_url)} 
                    className="text-[#7a1c1c] hover:text-red-800 text-xs font-semibold cursor-pointer"
                  >
                    Elimină
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  )
}
