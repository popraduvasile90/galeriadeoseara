'use server'

import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { Tablou } from '@/types'

export async function getTablouriActive(): Promise<Tablou[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('tablouri')
      .select(`
        *,
        oferte (
          id,
          tablou_id,
          user_id,
          nume_utilizator,
          telefon,
          suma,
          created_at
        )
      `)
      .order('data_limita', { ascending: true })
    
    if (error) throw new Error(error.message)

    const tablouri = (data as any[]) || []
    
    tablouri.forEach((t) => {
      if (t.oferte) {
        t.oferte.sort((a: any, b: any) => b.suma - a.suma)
      } else {
        t.oferte = []
      }
    })

    return tablouri as Tablou[]
  } catch (err: any) {
    console.error('Baza de date inaccesibilă sau lipsă chei Supabase:', err?.message || err)
    return []
  }
}

export async function getTablouCuOferte(id: string): Promise<Tablou | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('tablouri')
      .select(`
        *,
        oferte (
          id,
          tablou_id,
          user_id,
          nume_utilizator,
          telefon,
          suma,
          created_at
        )
      `)
      .eq('id', id)
      .single()

    if (error) return null
    
    const tablou = data as any
    if (tablou && tablou.oferte) {
      tablou.oferte.sort((a: any, b: any) => b.suma - a.suma)
    }
    return tablou as Tablou
  } catch {
    return null
  }
}

// Înregistrează un utilizator nou folosind nume, email (ca string unic) și parolă
export async function inregistreazaUtilizatorAction(nume: string, email: string, parola: string) {
  try {
    if (!isSupabaseAdminConfigured) {
      return {
        success: false,
        error: 'Proiectul Supabase nu este conectat încă. Adaugă cheile din noul tău proiect Supabase în fișierul .env.local pentru a activa creearea de conturi!'
      }
    }
    const numeTrim = nume.trim()
    const emailTrim = email.trim().toLowerCase()
    const parolaTrim = parola.trim()

    if (!numeTrim || !emailTrim || !parolaTrim) {
      return { success: false, error: 'Toate câmpurile (nume, e-mail, parolă) sunt obligatorii.' }
    }

    if (parolaTrim.length < 6) {
      return { success: false, error: 'Parola trebuie să aibă cel puțin 6 caractere.' }
    }

    // Generăm un număr de telefon fictiv pentru compatibilitate cu DB
    const telefonDummy = `07${Math.floor(10000000 + Math.random() * 90000000)}`

    // 3. Creăm utilizatorul în Auth prin admin API (bypassează confirmările de email și restricțiile de înregistrare publică)
    const { data: userData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: emailTrim,
      password: parolaTrim,
      email_confirm: true
    })

    if (authError || !userData.user) {
      throw new Error(authError?.message || 'Eroare la crearea contului.')
    }

    // 4. Creăm profilul
    const { error: insertError } = await supabaseAdmin
      .from('profile')
      .insert({
        id: userData.user.id,
        nume: numeTrim,
        telefon: telefonDummy
      })

    if (insertError) {
      // Ștergem user-ul din Auth în caz de eșec pentru consistență
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id)
      throw new Error(`Eroare la salvarea profilului: ${insertError.message}`)
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Obține datele profilului pentru utilizatorul logat curent
export async function getProfilUtilizator(accessToken: string) {
  try {
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken)
    if (authError || !user) return null

    const { data, error } = await supabaseAdmin
      .from('profile')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) return null
    return data as { id: string; nume: string; telefon: string }
  } catch {
    return null
  }
}

export async function plaseazaOfertaAction(
  tablouId: string, 
  accessToken: string,
  suma: number
) {
  try {
    if (!isSupabaseAdminConfigured) {
      return { 
        success: false, 
        error: 'Proiectul Supabase nu este conectat încă. Adaugă cheile din noul tău proiect Supabase în fișierul .env.local pentru a activa licitarea!' 
      }
    }

    if (isNaN(suma) || suma <= 0) {
      return { success: false, error: 'Suma oferită trebuie să fie pozitivă.' }
    }

    // Verificăm token-ul de acces pentru a obține ID-ul utilizatorului în mod securizat pe server
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken)
    if (authError || !user) {
      return { success: false, error: 'Trebuie să fiți autentificat pentru a licita.' }
    }

    // Obținem detaliile tabloului (preț pornire și preț curent) direct din DB pentru validare
    const { data: tablou, error: tablouError } = await supabaseAdmin
      .from('tablouri')
      .select('pret_pornire, pret_curent')
      .eq('id', tablouId)
      .single()

    if (tablouError || !tablou) {
      return { success: false, error: 'Tabloul nu a fost găsit.' }
    }

    // Verificăm pasul de 50 în 50 de la suma inițială
    const diff = suma - tablou.pret_pornire
    if (diff < 50 || diff % 50 !== 0) {
      return { 
        success: false, 
        error: `Suma oferită trebuie să fie un pas de exact 50 RON (sau multiplu de 50) peste prețul de pornire (${tablou.pret_pornire} RON). Exemple valide: ${tablou.pret_pornire + 50}, ${tablou.pret_pornire + 100}, etc.` 
      }
    }

    if (suma <= tablou.pret_curent) {
      return { success: false, error: `Suma oferită trebuie să fie mai mare decât prețul curent (${tablou.pret_curent} RON).` }
    }

    // Apelăm funcția RPC securizată care ia datele de contact direct din profilul user-ului
    const { data, error } = await supabaseAdmin.rpc('plaseaza_oferta_securizat', {
      p_tablou_id: tablouId,
      p_user_id: user.id,
      p_suma: suma
    })

    if (error) throw new Error(error.message)

    const res = data as { success: boolean; error?: string; new_price?: number }
    if (!res.success) {
      return { success: false, error: res.error || 'Eroare la plasarea ofertei.' }
    }

    // Căutăm cea mai recentă ofertă a utilizatorului pentru acest tablou (cea pe care tocmai am plasat-o)
    const { data: recentBid } = await supabaseAdmin
      .from('oferte')
      .select('id')
      .eq('tablou_id', tablouId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (recentBid) {
      // Ștergem toate celelalte oferte ale acestui utilizator pe acest tablou
      await supabaseAdmin
        .from('oferte')
        .delete()
        .eq('tablou_id', tablouId)
        .eq('user_id', user.id)
        .neq('id', recentBid.id)
    }

    revalidatePath('/user')
    revalidatePath('/admin')
    return { success: true, newPrice: res.new_price }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
