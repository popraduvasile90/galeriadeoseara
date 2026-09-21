'use client'

import React, { useState, useEffect } from 'react'
import { getTablouriActive, getTablouCuOferte, plaseazaOfertaAction, getProfilUtilizator, inregistreazaUtilizatorAction } from '@/actions/user-actions'
import { Tablou, Oferta } from '@/types'
import { supabaseClient } from '@/lib/supabase-client'
import ImageZoomModal from '@/components/ImageZoomModal'

export default function UserBiddingPage() {
  const [tablouri, setTablouri] = useState<Tablou[]>([])
  
  // Stari Autentificare Supabase
  const [sessionUser, setSessionUser] = useState<any | null>(null)
  const [userProfile, setUserProfile] = useState<{ nume: string; telefon: string } | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  
  // Campuri Formular Auth & Profile
  const [nume, setNume] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  // Stari de incarcare si feedback
  const [authLoading, setAuthLoading] = useState(false)
  const [authMesaj, setAuthMesaj] = useState('')
  const [isSuccessMesaj, setIsSuccessMesaj] = useState(false)

  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active')
  const [searchQuery, setSearchQuery] = useState('')
  const [zoomImage, setZoomImage] = useState<{ url: string; title: string } | null>(null)

  // 1. Ascultam schimbarile de sesiune Auth
  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionUser(session.user)
        incarcaProfil(session.access_token)
      }
    })

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSessionUser(session.user)
        incarcaProfil(session.access_token)
      } else {
        setSessionUser(null)
        setUserProfile(null)
        setProfileLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function incarcaProfil(token: string) {
    setProfileLoading(true)
    try {
      const prof = await getProfilUtilizator(token)
      if (prof) {
        setUserProfile({ nume: prof.nume, telefon: prof.telefon })
      } else {
        setUserProfile(null)
      }
    } catch (err) {
      console.error(err)
      setUserProfile(null)
    } finally {
      setProfileLoading(false)
    }
  }

  // 2. Logica de Creare Cont (Sign Up) + salvare Profil
  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setAuthLoading(true)
    setAuthMesaj('')

    try {
      // Apelăm acțiunea de înregistrare simplificată (salvează emailul ca string în auth.users prin admin API)
      const res = await inregistreazaUtilizatorAction(nume, email, password)
      if (!res.success) {
        throw new Error(res.error || 'Crearea contului a eșuat.')
      }

      // Conectăm automat utilizatorul după înregistrare
      const { data, error: loginError } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      })

      if (loginError) throw loginError

      if (data.session) {
        setIsSuccessMesaj(true)
        setAuthMesaj('✓ Cont creat și conectat cu succes!')
        incarcaProfil(data.session.access_token)
      }
    } catch (err: any) {
      setIsSuccessMesaj(false)
      setAuthMesaj(`❌ ${err.message}`)
    } finally {
      setAuthLoading(false)
    }
  }

  // 3. Logica de Autentificare (Login)
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setAuthLoading(true)
    setAuthMesaj('')

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw new Error('E-mail sau parolă incorectă.')

      if (data.session) {
        setIsSuccessMesaj(true)
        setAuthMesaj('✓ Conectat cu succes.')
        incarcaProfil(data.session.access_token)
      }
    } catch (err: any) {
      setIsSuccessMesaj(false)
      setAuthMesaj(`❌ ${err.message}`)
    } finally {
      setAuthLoading(false)
    }
  }

  // 4. Logica de Deconectare (Logout)
  async function handleLogout() {
    setAuthLoading(true)
    await supabaseClient.auth.signOut()
    setAuthLoading(false)
    setAuthMesaj('')
    setPassword('')
    setNume('')
    setEmail('')
    setUserProfile(null)
  }  // Incarca tablourile din baza de date
  async function incarcaDate() {
    try {
      const activeList = await getTablouriActive()
      setTablouri(activeList)
    } catch (err) {
      console.error(err)
    }
  }

  // Incarcare initiala si abonare Realtime
  useEffect(() => {
    incarcaDate()
  }, [])

  useEffect(() => {
    const channel = supabaseClient
      .channel('realtime-user-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tablouri' },
        () => {
          incarcaDate()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'oferte' },
        () => {
          incarcaDate()
        }
      )
      .subscribe()

    return () => {
      supabaseClient.removeChannel(channel)
    }
  }, [])

  const acum = new Date()
  const activeLots = tablouri.filter(t => new Date(t.data_limita) > acum)
  const completedLots = tablouri.filter(t => new Date(t.data_limita) <= acum)

  // Filtram toate licitatiile (active sau incheiate) la care userul curent autentificat a licitat
  // Le ordonam simplu descrescator dupa data limita (astfel cele active din viitor vor fi mereu primele, iar cele finalizate din trecut vor fi dedesubt, cu cele mai recent finalizate primele).
  const licitateDeMine = tablouri
    .filter(t => {
      if (!sessionUser) return false
      return t.oferte?.some(
        of => of.user_id === sessionUser.id
      )
    })
    .sort((a, b) => new Date(b.data_limita).getTime() - new Date(a.data_limita).getTime())

  // Logica de filtrare dupa textul din search
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

  const filteredActiveLots = activeLots.filter(matchesSearch)
  const filteredLicitateDeMine = licitateDeMine.filter(matchesSearch)

  const userIdentitate = userProfile ? { nume: userProfile.nume, telefon: userProfile.telefon } : null

  return (
    <div className="min-h-screen bg-[#fcfbfa] text-stone-900 p-4 md:p-8 font-sans selection:bg-amber-200">
      
      {/* Top Banner Status */}
      <div className="max-w-7xl mx-auto flex items-center gap-2 border-b border-stone-200 pb-4 mb-8 text-xs">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span className="font-serif italic text-stone-500">Conexiune live (WebSockets) activă • Autentificare securizată</span>
      </div>

      {/* Main Header */}
      <div className="text-center space-y-3 max-w-xl mx-auto mb-12">
        <span className="text-[10px] uppercase tracking-[0.3em] text-stone-400 font-bold block">
          Cabinetul Colecționarului
        </span>
        <h1 className="text-3xl md:text-4xl font-serif tracking-wide uppercase text-stone-850">
          Licitații Active & Catalog
        </h1>
        <p className="text-sm font-serif italic text-stone-500">
          Urmăriți loturile de artă deosebite și plasați oferte garantate tranzacțional.
        </p>

        {/* Navigation Tabs */}
        <div className="flex justify-center gap-4 pt-4">
          <button 
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 font-serif text-sm uppercase tracking-wider border-b-2 transition cursor-pointer ${
              activeTab === 'active' 
                ? 'border-[#7a1c1c] text-stone-900 font-bold' 
                : 'border-transparent text-stone-400 hover:text-stone-700'
            }`}
          >
            Loturi Active ({activeLots.length})
          </button>
          <button 
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 font-serif text-sm uppercase tracking-wider border-b-2 transition cursor-pointer ${
              activeTab === 'completed' 
                ? 'border-[#7a1c1c] text-stone-900 font-bold' 
                : 'border-transparent text-stone-400 hover:text-stone-700'
            }`}
          >
            Licitate de mine ({licitateDeMine.length})
          </button>
        </div>
      </div>

      {/* Search Input Bar (Centrat și integrat premium) */}
      <div className="max-w-md mx-auto mb-10 relative">
        <input 
          type="text" 
          placeholder="Caută după Cod Lot, Titlu sau Artist..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-3.5 pl-11 bg-white border border-stone-300 focus:border-stone-500 focus:outline-none text-sm text-stone-850 rounded-none shadow-2xs font-sans placeholder-stone-400"
        />
        <div className="absolute left-3.5 top-4.5 text-stone-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
          </svg>
        </div>
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-4 text-[10px] uppercase font-bold text-stone-400 hover:text-stone-700 font-serif tracking-wider"
          >
            Șterge
          </button>
        )}
      </div>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* Left Sidebar: Autentificare / Profil */}
        <div className="lg:col-span-1 bg-white border border-stone-300 p-6 shadow-sm lg:sticky lg:top-6">
          <h2 className="text-base font-serif uppercase tracking-wider text-stone-800 border-b border-stone-200 pb-3 mb-4">
            {sessionUser ? 'Contul Meu' : 'Autentificare'}
          </h2>

          {sessionUser ? (
            /* USER LOGAT */
            profileLoading ? (
              <p className="text-xs text-stone-400 italic text-center py-4">Se încarcă profilul...</p>
            ) : userProfile ? (
              /* PROFIL COMPLETAT */
              <div className="space-y-4 text-xs">
                <div className="bg-stone-50 p-4 border border-stone-200 space-y-2">
                  <div>Nume Utilizator: <strong className="text-stone-900 block text-sm">{userProfile.nume}</strong></div>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-250 text-emerald-800 text-[11px] text-center font-semibold animate-fade-in">
                  ✓ Conectat. Puteți plasa oferte tranzacționale.
                </div>

                <button
                  onClick={handleLogout}
                  disabled={authLoading}
                  className="w-full border border-stone-800 bg-white hover:bg-stone-50 text-stone-900 p-3 uppercase font-serif tracking-widest font-bold transition rounded-none shadow-sm cursor-pointer text-xs"
                >
                  Deconectare
                </button>
              </div>
            ) : (
              /* LOGAT DAR FĂRĂ PROFIL (FALLBACK) */
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-relaxed mb-2 font-serif italic text-center">
                  Se încarcă profilul...
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full border border-stone-400 bg-white hover:bg-stone-50 text-stone-700 p-2.5 uppercase font-serif tracking-wider font-semibold transition rounded-none text-[10px] mt-2 cursor-pointer"
                >
                  Deconectare
                </button>
              </div>
            )
          ) : (
            /* USER NE-LOGAT */
            <div className="space-y-5">
              <div className="flex border-b border-stone-200 text-xs">
                <button
                  onClick={() => { setAuthMode('login'); setAuthMesaj(''); }}
                  className={`w-1/2 pb-2 font-bold uppercase tracking-wider cursor-pointer ${authMode === 'login' ? 'text-stone-900 border-b-2 border-[#7a1c1c]' : 'text-stone-400'}`}
                >
                  Conectare
                </button>
                <button
                  onClick={() => { setAuthMode('signup'); setAuthMesaj(''); }}
                  className={`w-1/2 pb-2 font-bold uppercase tracking-wider cursor-pointer ${authMode === 'signup' ? 'text-stone-900 border-b-2 border-[#7a1c1c]' : 'text-stone-400'}`}
                >
                  Creare Cont
                </button>
              </div>
              <form onSubmit={authMode === 'login' ? handleLogin : handleSignUp} className="space-y-4 text-xs tracking-wide">
                {authMode === 'signup' && (
                  <div>
                    <label className="block font-semibold uppercase text-stone-600">Nume Complet</label>
                    <input 
                      type="text" 
                      value={nume}
                      onChange={(e) => setNume(e.target.value)}
                      placeholder="Ex: Ion Popescu"
                      required
                      className="w-full p-3 mt-1.5 bg-stone-50 border border-stone-300 focus:border-stone-500 focus:outline-none rounded-none text-sm text-stone-850" 
                    />
                  </div>
                )}

                <div>
                  <label className="block font-semibold uppercase text-stone-600">E-mail</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@exemplu.com"
                    required
                    className="w-full p-3 mt-1.5 bg-stone-50 border border-stone-300 focus:border-stone-500 focus:outline-none rounded-none text-sm text-stone-850" 
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase text-stone-600">Parolă</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full p-3 mt-1.5 bg-stone-50 border border-stone-300 focus:border-stone-500 focus:outline-none rounded-none text-sm text-stone-850" 
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-[#7a1c1c] hover:bg-[#5f1515] text-white p-3.5 uppercase font-serif tracking-widest font-bold transition disabled:opacity-50 rounded-none shadow-sm cursor-pointer text-xs"
                >
                  {authLoading ? 'Se procesează...' : (authMode === 'login' ? 'Conectare' : 'Înregistrare')}
                </button>
              </form>
              {authMesaj && (
                <div className={`p-3 border text-[11px] text-center leading-relaxed font-sans ${
                  isSuccessMesaj 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold' 
                    : 'bg-red-50 border-red-250 text-[#7a1c1c] font-bold'
                }`}>
                  {authMesaj}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Area: Lot Grid */}
        <div className="lg:col-span-3">
          {activeTab === 'active' ? (
            filteredActiveLots.length === 0 ? (
              <div className="text-center py-16 border border-stone-200 bg-white">
                <p className="text-stone-400 font-serif italic text-base">
                  Nu s-a găsit niciun lot activ care să corespundă căutării.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredActiveLots.map((t) => (
                  <LotCard 
                    key={t.id} 
                    tablou={t} 
                    sessionUser={sessionUser} 
                    userProfile={userProfile}
                    onBidSuccess={incarcaDate}
                    onZoomImage={(url, title) => setZoomImage({ url, title })}
                  />
                ))}
              </div>
            )
          ) : (
            filteredLicitateDeMine.length === 0 ? (
              <div className="text-center py-16 border border-stone-200 bg-white">
                <p className="text-stone-400 font-serif italic text-base">
                  Nu s-a găsit nicio licitație personală care să corespundă căutării.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredLicitateDeMine.map((t) => (
                  <LotCard 
                    key={t.id} 
                    tablou={t} 
                    sessionUser={sessionUser} 
                    userProfile={userProfile}
                    onBidSuccess={incarcaDate}
                    onZoomImage={(url, title) => setZoomImage({ url, title })}
                  />
                ))}
              </div>
            )
          )}
        </div>

      </div>

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

// Subcomponenta LotCard
function LotCard({ 
  tablou, 
  sessionUser, 
  userProfile,
  onBidSuccess,
  onZoomImage
}: { 
  tablou: Tablou
  sessionUser: any | null
  userProfile: { nume: string; telefon: string } | null
  onBidSuccess: () => void
  onZoomImage: (url: string, title: string) => void
}) {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null)
  const [bidValue, setBidValue] = useState<number | ''>(tablou.pret_curent + 50)
  const [loading, setLoading] = useState(false)
  const [errorMesaj, setErrorMesaj] = useState('')
  const [successMesaj, setSuccessMesaj] = useState('')
  const [detailedTablou, setDetailedTablou] = useState<Tablou | null>(null)
  const [loadingBids, setLoadingBids] = useState(false)

  const limitDate = new Date(tablou.data_limita)
  const isExpired = limitDate <= new Date()
  const oferte = tablou.oferte || []

  // Seteaza valoarea implicita a bidului
  useEffect(() => {
    setBidValue(tablou.pret_curent + 50)
  }, [tablou.pret_curent])

  // Timer countdown
  useEffect(() => {
    if (isExpired) return

    function updateTimer() {
      const difference = limitDate.getTime() - new Date().getTime()
      if (difference <= 0) {
        setTimeLeft(null)
        onBidSuccess()
        return
      }

      const hours = Math.floor(difference / (1000 * 60 * 60))
      const minutes = Math.floor((difference / 1000 / 60) % 65 % 60)
      const seconds = Math.floor((difference / 1000) % 65 % 60)

      setTimeLeft({ hours, minutes, seconds })
    }

    updateTimer()
    const timer = setInterval(updateTimer, 1000)
    return () => clearInterval(timer)
  }, [tablou.data_limita, isExpired])

  // Incarca istoricul de oferte
  async function incarcaDetaliiLicitatie() {
    if (!isExpired) return
    setLoadingBids(true)
    try {
      const details = await getTablouCuOferte(tablou.id)
      setDetailedTablou(details)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingBids(false)
    }
  }

  useEffect(() => {
    incarcaDetaliiLicitatie()
  }, [isExpired, tablou.id, tablou.pret_curent])

  async function handleBid(e: React.FormEvent) {
    e.preventDefault()
    if (!sessionUser || !userProfile) return

    setLoading(true)
    setErrorMesaj('')
    setSuccessMesaj('')

    if (bidValue === '') {
      setErrorMesaj('❌ Vă rugăm să introduceți o sumă validă.')
      setLoading(false)
      return
    }

    const { data: { session } } = await supabaseClient.auth.getSession()
    const token = session?.access_token

    if (!token) {
      setErrorMesaj('❌ Sesiune expirată. Vă rugăm să vă reconectați.')
      setLoading(false)
      return
    }

    const res = await plaseazaOfertaAction(tablou.id, token, bidValue)
    setLoading(false)

    if (res.success) {
      setSuccessMesaj('✅ Oferta dvs. a fost plasată cu succes!')
      onBidSuccess()
    } else {
      setErrorMesaj(`❌ ${res.error}`)
    }
  }

  // Verificari pe baza id-ului din Auth (securizat)
  const areOferteUser = sessionUser && oferte.some(
    of => of.user_id === sessionUser.id
  )

  const liderOferta = oferte.length > 0 ? oferte[0] : null
  
  const esteLiderUser = liderOferta && sessionUser &&
    liderOferta.user_id === sessionUser.id

  const castigator = detailedTablou && detailedTablou.oferte && detailedTablou.oferte.length > 0 
    ? detailedTablou.oferte[0] 
    : null

  const esteCastigatorCurent = castigator && sessionUser && 
    castigator.user_id === sessionUser.id

  const isBiddingDisabled = !sessionUser || !userProfile

  // Stabilim clasa pentru marginea cadrului (3px), în funcție de starea licitării utilizatorului
  let borderClass = 'border-[3px] border-stone-300 hover:border-stone-500'
  if (sessionUser && areOferteUser) {
    if (esteLiderUser) {
      borderClass = 'border-[3px] border-emerald-600/40 hover:border-emerald-600/60 shadow-2xs'
    } else {
      borderClass = 'border-[3px] border-[#7a1c1c]/40 hover:border-[#7a1c1c]/60 shadow-2xs'
    }
  }

  return (
    <div className={`bg-white p-6 md:p-8 shadow-sm flex flex-col justify-between transition-all font-sans ${borderClass}`}>
      <div>
        {/* Imagine */}
        <div 
          onClick={() => onZoomImage(tablou.imagine_url, tablou.titlu)}
          className="relative w-full h-80 bg-stone-100 overflow-hidden mb-6 border border-stone-100 cursor-zoom-in group"
        >
          <img 
            src={tablou.imagine_url} 
            alt={tablou.titlu} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
          />
          {/* Lupa (magnifying glass) indicator */}
          <div className="absolute bottom-2.5 right-2.5 bg-white/90 hover:bg-white text-stone-800 p-1.5 shadow-sm border border-stone-200/80 transition-all duration-300 transform group-hover:scale-110 flex items-center justify-center z-10">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 text-[#7a1c1c]">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 8.5v4m2-2h-4" />
            </svg>
          </div>
          {isExpired ? (
            areOferteUser ? (
              esteLiderUser ? (
                <span className="absolute top-4 right-4 bg-emerald-650 text-white font-serif uppercase tracking-widest text-[9px] px-3 py-1.5 shadow-md font-bold bg-emerald-600">
                  Câștigat
                </span>
              ) : (
                <span className="absolute top-4 right-4 bg-[#7a1c1c] text-white font-serif uppercase tracking-widest text-[9px] px-3 py-1.5 shadow-md font-bold">
                  Pierdut
                </span>
              )
            ) : (
              <span className="absolute top-4 right-4 bg-stone-900 text-white font-serif uppercase tracking-widest text-[9px] px-3 py-1.5 shadow-md">
                Adjudecat
              </span>
            )
          ) : (
            <span className="absolute top-4 right-4 bg-yellow-400 text-stone-950 font-serif uppercase tracking-widest text-[9px] px-3 py-1.5 shadow-md font-bold animate-pulse">
              Activ
            </span>
          )}
        </div>

        {/* Info Lucrare */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 pb-4 border-b border-stone-100">
          <div className="space-y-1 text-xs tracking-wide">
            <div>
              <span className="font-semibold uppercase text-stone-500 font-serif">ARTIST: </span>
              <span className="text-stone-900 font-sans font-bold text-sm">{tablou.autor}</span>
            </div>
            <div>
              <span className="font-semibold uppercase text-stone-500 font-serif">TITLU: </span>
              <span className="text-stone-900 font-sans font-bold text-sm uppercase">{tablou.titlu}</span>
            </div>
          </div>
          {tablou.cod_lot && (
            <div className="border border-stone-300 px-4 py-2 bg-[#faf9f6] text-center font-mono text-sm font-bold text-stone-700 shrink-0 self-start sm:self-auto min-w-[90px] shadow-2xs">
              {tablou.cod_lot}
            </div>
          )}
        </div>

        {/* Avertizare Outbid / Lider în timp real pe active */}
        {!isExpired && areOferteUser && (
          <div className="mb-6">
            {esteLiderUser ? (
              <div className="bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs font-semibold p-3 text-center font-sans">
                ✓ Sunteți liderul licitației pe acest lot.
              </div>
            ) : (
              <div className="bg-red-50 border border-red-250 text-[#7a1c1c] text-xs font-bold p-3 text-center font-sans animate-pulse">
                ⚠️ Ați fost depășit! Licitați mai mult pentru a recâștiga.
              </div>
            )}
          </div>
        )}

        {/* Status după încheierea licitației (Câștigat / Listă de așteptare) */}
        {isExpired && areOferteUser && (
          <div className="mb-6">
            {esteLiderUser ? (
              <div className="bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs font-bold p-3.5 text-center font-sans">
                🎉 Felicitări! Ați câștigat această licitație.
              </div>
            ) : (
              <div className="bg-red-50 border border-red-250 text-[#7a1c1c] text-xs font-bold p-3.5 text-center font-sans leading-relaxed">
                ⏳ Din păcate, altcineva a câștigat licitația, dar sunteți pe lista de așteptare (Poziția {(() => {
                  const idx = oferte.findIndex(of => of.user_id === sessionUser.id);
                  return idx !== -1 ? idx : '-';
                })()}). Dacă cei dinaintea voastră nu revendică premiul, o să fiți contactat.
              </div>
            )}
          </div>
        )}

        {/* Tehnică & Descriere completă */}
        {tablou.descriere && (
          <div className="mb-6">
            <span className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold block mb-1">
              Tehnică & Descriere
            </span>
            <p className="text-xs text-stone-600 leading-relaxed text-justify whitespace-pre-wrap font-sans">
              {tablou.descriere}
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-stone-100 pt-6 space-y-4">
        {/* Status Licitatie & Pret */}
        <div className="flex items-end justify-between bg-[#faf9f6] p-4 border border-stone-100">
          <div>
            <span className="text-[9px] uppercase tracking-wider text-stone-400 block mb-0.5">Preț Curent</span>
            <span className="font-mono text-lg font-bold text-[#7a1c1c] block whitespace-nowrap">
              {tablou.pret_curent} RON
            </span>
          </div>

          <div className="text-right">
            {isExpired ? (
              <span className="text-[10px] text-stone-500 block font-serif italic">
                Încheiat la data: <br />
                {new Date(tablou.data_limita).toLocaleString('ro-RO')}
              </span>
            ) : timeLeft ? (
              <div>
                <span className="text-[9px] uppercase tracking-wider text-stone-400 block mb-0.5">Timp Rămas</span>
                <span className="font-mono text-sm font-bold text-stone-800 block whitespace-nowrap">
                  {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
                </span>
              </div>
            ) : (
              <span className="text-xs text-stone-400 block font-mono">Calculare...</span>
            )}
          </div>
        </div>

        {/* Ultimele 5 Oferte */}
        {!isExpired && oferte.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[9px] uppercase tracking-wider text-stone-400 font-bold block">
              Istoric Oferte (Ultimele 5)
            </span>
            <div className="border border-stone-200">
              <table className="w-full text-left text-[11px] border-collapse bg-white">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-[9px] uppercase tracking-wider text-stone-400 font-semibold">
                    <th className="py-1 px-3">Licitator</th>
                    <th className="py-1 px-3 text-right">Sumă</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-sans">
                  {oferte.slice(0, 5).map((of) => (
                    <tr key={of.id} className="hover:bg-stone-50/50">
                      <td className="py-1.5 px-3 font-semibold text-stone-700">{of.nume_utilizator}</td>
                      <td className="py-1.5 px-3 text-right font-mono font-bold text-stone-850">{of.suma} RON</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sectiunea Bidding Activa */}
        {!isExpired && (
          <form onSubmit={handleBid} className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-3.5 text-xs text-stone-400 font-mono font-semibold">RON</span>
                <input 
                  type="number" 
                  min={tablou.pret_curent + 50}
                  step={50}
                  max="999999999999999"
                  value={bidValue}
                  onChange={(e) => {
                    const val = e.target.value
                    setBidValue(val === '' ? '' : parseFloat(val))
                  }}
                  required
                  disabled={isBiddingDisabled}
                  className="w-full pl-12 pr-3 py-3 bg-stone-50 border border-stone-300 focus:border-stone-500 focus:outline-none rounded-none text-sm font-mono text-stone-850 disabled:opacity-50" 
                />
              </div>

              <button 
                type="submit"
                disabled={loading || isBiddingDisabled}
                className="bg-[#7a1c1c] hover:bg-[#5f1515] text-white px-6 uppercase font-serif tracking-widest font-bold transition-all disabled:opacity-50 rounded-none shadow-sm cursor-pointer text-xs"
              >
                {loading ? 'Se procesează...' : 'Licitează'}
              </button>
            </div>

            {!sessionUser && (
              <p className="text-[10px] text-[#7a1c1c] font-semibold mt-1 font-serif italic">
                * Conectați-vă în panoul din stânga pentru a debloca licitarea.
              </p>
            )}

            {sessionUser && !userProfile && (
              <p className="text-[10px] text-amber-600 font-semibold mt-1 font-serif italic">
                * Finalizați înregistrarea profilului în stânga pentru a putea licita.
              </p>
            )}

            {!isBiddingDisabled && (
              <p className="text-[10px] text-stone-400 font-serif italic">
                * Suma licitată trebuie să fie un pas de exact 50 RON peste prețul de pornire.
              </p>
            )}

            {errorMesaj && <p className="text-xs text-[#7a1c1c] font-semibold mt-1">{errorMesaj}</p>}
            {successMesaj && <p className="text-xs text-emerald-600 font-semibold mt-1">{successMesaj}</p>}
          </form>
        )}

        {/* Sectiunea Rezultat Adjudecare & IBAN */}
        {isExpired && (
          <div className="space-y-4">
            {loadingBids ? (
              <p className="text-xs text-stone-400 italic">Se încarcă rezultatul adjudecării...</p>
            ) : castigator ? (
              <div className="border border-stone-200 p-4 space-y-3 bg-white">
                {esteCastigatorCurent ? (
                  <div className="space-y-3">
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider px-2 py-1 inline-block">
                      🎉 Lot Adjudecat de Dvs.
                    </span>
                    <h4 className="font-serif text-sm font-bold text-stone-850 leading-tight">
                      Felicitări! Ați câștigat licitația pentru suma de {castigator.suma} RON.
                    </h4>
                    <p className="text-xs text-stone-650 leading-relaxed text-justify">
                      Pentru finalizarea achiziției, vă rugăm să efectuați plata în contul IBAN al galeriei de artă, menționând în detaliile transferului titlul lucrării: <strong>"{tablou.titlu}"</strong>.
                    </p>
                    <div className="bg-[#fcfbfa] border border-stone-300 p-3 font-mono text-[11px] text-stone-800 space-y-1 select-all select-text">
                      <div>IBAN: <strong>RO73 BTRL 0130 9999 8888 7777 XX</strong></div>
                      <div>Beneficiar: <strong>Galeria Licitatie-Sandbox SRL</strong></div>
                      <div>Banca: <strong>Banca Transilvania</strong></div>
                    </div>
                    <p className="text-[10px] text-stone-500 font-serif italic">
                      Sunteți înregistrat securizat în contul dvs. Reprezentanții noștri vă vor contacta telefonic pentru livrare.
                    </p>
                  </div>
                ) : (
                  <div>
                    <span className="bg-stone-100 text-stone-600 text-[9px] font-bold uppercase tracking-wider px-2 py-1 inline-block mb-2">
                      Adjudecat
                    </span>
                    <p className="text-xs text-stone-650 leading-relaxed">
                      Lucrarea a fost adjudecată de <strong>{castigator.nume_utilizator}</strong> la prețul final de <strong>{castigator.suma} RON</strong>.
                    </p>
                  </div>
                )}

                {/* Istoric/Alte oferte (Rezerve) */}
                {detailedTablou && detailedTablou.oferte && detailedTablou.oferte.length > 1 && (
                  <div className="pt-3 border-t border-stone-100 mt-2">
                    <span className="text-[10px] uppercase tracking-wider text-stone-400 font-bold block mb-1">
                      Alte Oferte înregistrate (Rezerve)
                    </span>
                    <ul className="space-y-1 max-h-24 overflow-y-auto pr-1">
                      {detailedTablou.oferte.slice(1).map((of: Oferta, idx: number) => (
                        <li key={of.id} className="text-[11px] text-stone-500 flex justify-between">
                          <span>{idx + 1}. {of.nume_utilizator}</span>
                          <span className="font-mono font-semibold">{of.suma} RON</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-stone-50 p-4 border border-stone-200 text-center">
                <p className="text-xs text-stone-400 font-serif italic">
                  Timpul a expirat. Nu a fost înregistrată nicio ofertă de preț pentru acest lot.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
