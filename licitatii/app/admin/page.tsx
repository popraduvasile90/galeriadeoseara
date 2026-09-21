'use client'

import { useState, useEffect } from 'react'
import { getTablouri, getTablouriAdjudecate } from '@/actions/admin-actions'
import { Tablou, Oferta } from '@/types'
import LotForm from '@/components/admin/LotForm'
import LotList from '@/components/admin/LotList'
import EditLotModal from '@/components/admin/EditLotModal'
import BidHistoryModal from '@/components/admin/BidHistoryModal'
import { supabaseClient } from '@/lib/supabase-client'
import ImageZoomModal from '@/components/ImageZoomModal'

export default function AdminPage() {
  const [tablouriActive, setTablouriActive] = useState<Tablou[]>([])
  const [tablouriAdjudecate, setTablouriAdjudecate] = useState<Tablou[]>([])
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active')
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedTablou, setSelectedTablou] = useState<Tablou | null>(null)
  
  // Modal istoric oferte
  const [showBidsModal, setShowBidsModal] = useState(false)
  const [selectedBidsTablou, setSelectedBidsTablou] = useState<Tablou | null>(null)
  const [zoomImage, setZoomImage] = useState<{ url: string; title: string } | null>(null)

  // Logica de filtrare a tablourilor pe baza textului din search
  const matchesSearch = (t: Tablou) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    return (
      t.titlu?.toLowerCase().includes(q) ||
      t.autor?.toLowerCase().includes(q) ||
      t.cod_lot?.toLowerCase().includes(q) ||
      t.id?.toLowerCase().includes(q)
    )
  }

  const filteredActive = tablouriActive.filter(matchesSearch)
  const filteredAdjudecate = tablouriAdjudecate.filter(matchesSearch)

  async function incarcaTablouriActive() {
    try {
      const date = await getTablouri()
      setTablouriActive(date)
      // Daca modalul cu oferte este deschis, actualizam datele tabloului din modal in timp real
      if (selectedBidsTablou) {
        const updated = date.find(t => t.id === selectedBidsTablou.id)
        if (updated) setSelectedBidsTablou(updated)
      }
    } catch (err) {
      console.error('Eroare la încărcarea tablourilor active:', err)
    }
  }

  async function incarcaTablouriAdjudecate() {
    try {
      const date = await getTablouriAdjudecate()
      setTablouriAdjudecate(date)
    } catch (err) {
      console.error('Eroare la încărcarea istoricului:', err)
    }
  }

  // Încărcare inițială a datelor
  useEffect(() => {
    incarcaTablouriActive()
    incarcaTablouriAdjudecate()
  }, [])

  // SUPABASE REALTIME: Ascultare live modificari in baza de date
  useEffect(() => {
    const channel = supabaseClient
      .channel('realtime-admin-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tablouri' },
        () => {
          incarcaTablouriActive()
          incarcaTablouriAdjudecate()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'oferte' },
        () => {
          incarcaTablouriActive()
          incarcaTablouriAdjudecate()
        }
      )
      .subscribe()

    return () => {
      supabaseClient.removeChannel(channel)
    }
  }, [selectedBidsTablou])

  return (
    <div className="min-h-screen bg-[#fcfbfa] text-stone-900 p-4 md:p-8 flex flex-col items-center space-y-8 font-sans selection:bg-amber-200">
      
      {/* HEADER STIL GALERIE VECHE */}
      <div className="text-center space-y-3 border-b border-stone-300 pb-6 w-full max-w-6xl">
        <h1 className="text-3xl font-serif tracking-wide uppercase text-stone-800">Panou Administrare</h1>
        <p className="text-sm font-serif italic text-stone-500">Catalog de Licitații & Management Opere de Artă</p>
        
        {/* Butoane Dashboard/Tab-uri */}
        <div className="flex justify-center gap-4 pt-4">
          <button 
            onClick={() => setActiveTab('active')}
            className={`px-5 py-2.5 font-serif text-xs uppercase tracking-widest font-bold border transition-all cursor-pointer ${
              activeTab === 'active'
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
            }`}
          >
            Tablouri Active ({tablouriActive.length})
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-5 py-2.5 font-serif text-xs uppercase tracking-widest font-bold border transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
            }`}
          >
            Istoric / Adjudecate ({tablouriAdjudecate.length})
          </button>
        </div>
      </div>

      <div className="w-full max-w-6xl space-y-6">
        {/* Search Input Bar (Centrat și integrat premium) */}
        <div className="max-w-md mx-auto relative">
          <input 
            type="text" 
            placeholder="Caută după Cod Lot, Titlu sau Artist..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-3.5 pl-11 bg-white border border-stone-300 focus:border-stone-500 focus:outline-none text-xs text-stone-850 rounded-none shadow-2xs font-sans placeholder-stone-400"
          />
          <div className="absolute left-3.5 top-4.5 text-stone-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
            </svg>
          </div>
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-4 text-[9px] uppercase font-bold text-stone-400 hover:text-stone-700 font-serif tracking-wider"
            >
              Șterge
            </button>
          )}
        </div>

        {activeTab === 'active' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* FORMULAR ADĂUGARE */}
            <LotForm onSuccess={incarcaTablouriActive} />

            {/* LISTĂ INVENTAR ACTIVE */}
            <LotList 
              tablouri={filteredActive} 
              onEditClick={(t) => {
                setSelectedTablou(t)
                setShowModal(true)
              }} 
              onDeleteSuccess={incarcaTablouriActive}
              onViewBids={(t) => {
                setSelectedBidsTablou(t)
                setShowBidsModal(true)
              }}
              onZoomImage={(url, title) => setZoomImage({ url, title })}
            />
          </div>
        ) : (
          /* ISTORIC TABLOURI ADJUDEGATE */
          <div className="bg-white border border-stone-200 p-6 md:p-8 shadow-sm space-y-6">
            <h2 className="text-xl font-serif uppercase tracking-wider text-stone-800 border-b border-stone-100 pb-3 mb-6">
              Istoric Loturi Încheiate
            </h2>
            
            {filteredAdjudecate.length === 0 ? (
              <p className="text-stone-400 font-serif italic text-sm text-center py-12">
                Nu s-a găsit nicio licitație finalizată care să corespundă căutării.
              </p>
            ) : (
              <div className="space-y-8">
                {filteredAdjudecate.map((t) => {
                  const castigator = t.oferte && t.oferte.length > 0 ? t.oferte[0] : null
                  const rezerve = t.oferte && t.oferte.length > 1 ? t.oferte.slice(1) : []

                  return (
                    <div 
                      key={t.id} 
                      className="border border-stone-250 bg-[#faf9f6] p-6 flex flex-col md:flex-row gap-6 items-start justify-between hover:border-stone-400 transition-all"
                    >
                      {/* Product Overview */}
                      <div className="flex flex-col sm:flex-row items-start gap-4 flex-1">
                        <div 
                          onClick={() => setZoomImage({ url: t.imagine_url, title: t.titlu })}
                          className="relative w-24 h-24 bg-white border border-stone-200 cursor-zoom-in group shrink-0"
                        >
                          <img 
                            src={t.imagine_url} 
                            alt={t.titlu} 
                            className="w-full h-full object-cover p-1 transition-transform duration-350 group-hover:scale-105" 
                          />
                          <div className="absolute bottom-1 right-1 bg-white/90 hover:bg-white text-stone-800 p-1 shadow-sm border border-stone-200/80 transition-all duration-300 transform group-hover:scale-110 flex items-center justify-center z-10">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-2.5 h-2.5 text-[#7a1c1c]">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 8.5v4m2-2h-4" />
                            </svg>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase tracking-wider text-stone-400 font-semibold block">
                            Lot #{t.id}
                          </span>
                          <h3 className="font-serif text-base font-bold text-stone-800 leading-tight">
                            {t.titlu}
                          </h3>
                          <p className="text-xs text-stone-500 font-serif italic">
                            Autor: <span className="text-stone-700 font-sans font-semibold not-italic">{t.autor}</span>
                          </p>
                          <p className="text-xs text-stone-400 font-mono">
                            Încheiat la: {new Date(t.data_limita).toLocaleString('ro-RO')}
                          </p>
                        </div>
                      </div>

                      {/* Winners & Backup Bidders Grid */}
                      <div className="flex-1 w-full space-y-4">
                        {/* Winner details */}
                        <div className="border border-stone-300 p-4 bg-white space-y-2">
                          <span className="bg-[#7a1c1c] text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 inline-block">
                            Câștigător Adjudecare
                          </span>
                          {castigator ? (
                            <div className="text-xs space-y-1">
                              <div>Nume: <strong className="text-stone-900">{castigator.nume_utilizator}</strong></div>
                              <div>Telefon: <span className="font-mono text-stone-700">{castigator.telefon}</span></div>
                              <div>Suma adjudecată: <strong className="text-[#7a1c1c] font-mono">{castigator.suma} RON</strong></div>
                            </div>
                          ) : (
                            <p className="text-xs text-stone-450 italic">Licitație încheiată fără oferte plasate.</p>
                          )}
                        </div>

                        {/* Backup List */}
                        {rezerve.length > 0 && (
                          <div className="border border-stone-200 p-4 bg-white space-y-2">
                            <span className="text-[10px] uppercase tracking-wider text-stone-400 font-bold block border-b border-stone-100 pb-1">
                              Lista de Rezerve (În ordinea ofertelor)
                            </span>
                            <div className="overflow-x-auto">
                              <table className="w-full text-[11px] text-stone-600 text-left border-collapse">
                                <thead>
                                  <tr className="border-b border-stone-200 text-[10px] uppercase text-stone-400">
                                    <th className="py-1">Poz</th>
                                    <th className="py-1">Nume</th>
                                    <th className="py-1">Telefon</th>
                                    <th className="py-1 text-right">Sumă</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                  {rezerve.map((r, idx) => (
                                    <tr key={r.id} className="hover:bg-stone-50">
                                      <td className="py-1.5 font-bold">{idx + 2}</td>
                                      <td className="py-1.5">{r.nume_utilizator}</td>
                                      <td className="py-1.5 font-mono">{r.telefon}</td>
                                      <td className="py-1.5 text-right font-mono font-semibold">{r.suma} RON</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL EDITARE ACTIVE */}
      {showModal && selectedTablou && (
        <EditLotModal 
          selectedTablou={selectedTablou} 
          onClose={() => {
            setShowModal(false)
            setSelectedTablou(null)
          }} 
          onSuccess={() => {
            setShowModal(false)
            setSelectedTablou(null)
            incarcaTablouriActive()
          }} 
        />
      )}

      {/* MODAL ISTORIC OFERTE ADMIN */}
      {showBidsModal && selectedBidsTablou && (
        <BidHistoryModal 
          tablou={selectedBidsTablou} 
          onClose={() => {
            setShowBidsModal(false)
            setSelectedBidsTablou(null)
          }}
        />
      )}

      {/* MODAL ZOOM POZA */}
      {zoomImage && (
        <ImageZoomModal 
          imageUrl={zoomImage.url} 
          title={zoomImage.title} 
          onClose={() => setZoomImage(null)} 
        />
      )}

    </div>
  )
}