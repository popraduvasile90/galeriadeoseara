'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { Tablou } from '@/types'

export async function getTablouri(): Promise<Tablou[]> {
  const { data, error } = await supabaseAdmin
    .from('tablouri')
    .select(`
      *,
      oferte (
        id,
        tablou_id,
        nume_utilizator,
        telefon,
        suma,
        created_at
      )
    `)
    .gt('data_limita', new Date().toISOString())
    .order('created_at', { ascending: false })
  
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
}

export async function getTablouriAdjudecate(): Promise<Tablou[]> {
  const { data, error } = await supabaseAdmin
    .from('tablouri')
    .select(`
      *,
      oferte (
        id,
        tablou_id,
        nume_utilizator,
        telefon,
        suma,
        created_at
      )
    `)
    .lte('data_limita', new Date().toISOString())
    .order('data_limita', { ascending: false })

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
}

export async function adaugaTablou(formData: FormData) {
  try {
    const titlu = formData.get('titlu') as string
    const autor = formData.get('autor') as string
    const codLot = formData.get('codLot') as string
    const descriere = formData.get('descriere') as string
    const pretPornire = parseFloat(formData.get('pretPornire') as string)
    const dataLimita = formData.get('dataLimita') as string
    const file = formData.get('imagine') as File

    // VALIDARI:
    if (!codLot || !codLot.trim()) {
      return { success: false, error: 'Codul lotului este obligatoriu.' }
    }

    if (isNaN(pretPornire) || pretPornire <= 0) {
      return { success: false, error: 'Prețul de pornire trebuie să fie un număr pozitiv mai mare ca 0.' }
    }

    if (pretPornire > 999999999999999) {
      return { success: false, error: 'Prețul de pornire depășește limita maximă permisă (15 cifre).' }
    }

    if (descriere && descriere.length > 1000) {
      return { success: false, error: 'Descrierea nu poate depăși 1000 de caractere.' }
    }

    const dateLimitaObj = new Date(dataLimita)
    if (isNaN(dateLimitaObj.getTime()) || dateLimitaObj <= new Date()) {
      return { success: false, error: 'Data de încheiere trebuie să fie în viitor.' }
    }

    if (!file || file.size === 0) {
      return { success: false, error: 'Imaginea tabloului este obligatorie.' }
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${crypto.randomUUID()}.${fileExt}`

    const { error: storageError } = await supabaseAdmin.storage
      .from('imagini-tablouri')
      .upload(fileName, file, { contentType: file.type, upsert: false })

    if (storageError) throw new Error(`Eroare Storage: ${storageError.message}`)

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('imagini-tablouri')
      .getPublicUrl(fileName)

    const { error: dbError } = await supabaseAdmin
      .from('tablouri')
      .insert([
        {
          titlu,
          autor,
          cod_lot: codLot.trim(),
          descriere,
          imagine_url: publicUrl,
          pret_pornire: pretPornire,
          pret_curent: pretPornire,
          data_limita: dateLimitaObj.toISOString(),
          status: 'draft'
        }
      ])

    if (dbError) throw new Error(`Eroare DB: ${dbError.message}`)

    revalidatePath('/admin')
    revalidatePath('/user')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function stergeTablou(id: string, imagineUrl: string) {
  try {
    const fileName = imagineUrl.split('/').pop()
    if (fileName) {
      await supabaseAdmin.storage.from('imagini-tablouri').remove([fileName])
    }

    const { error } = await supabaseAdmin.from('tablouri').delete().eq('id', id)
    if (error) throw error

    revalidatePath('/admin')
    revalidatePath('/user')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function actualizeazaTablou(id: string, formData: FormData) {
  try {
    const titlu = formData.get('titlu') as string
    const autor = formData.get('autor') as string
    const codLot = formData.get('codLot') as string
    const descriere = formData.get('descriere') as string
    const pretPornire = parseFloat(formData.get('pretPornire') as string)
    const dataLimita = formData.get('dataLimita') as string

    // VALIDARI:
    if (!codLot || !codLot.trim()) {
      return { success: false, error: 'Codul lotului este obligatoriu.' }
    }

    if (isNaN(pretPornire) || pretPornire <= 0) {
      return { success: false, error: 'Prețul trebuie să fie un număr pozitiv mai mare ca 0.' }
    }

    if (pretPornire > 999999999999999) {
      return { success: false, error: 'Prețul depășește limita maximă permisă (15 cifre).' }
    }

    if (descriere && descriere.length > 1000) {
      return { success: false, error: 'Descrierea nu poate depăși 1000 de caractere.' }
    }

    const dateLimitaObj = new Date(dataLimita)
    if (isNaN(dateLimitaObj.getTime()) || dateLimitaObj <= new Date()) {
      return { success: false, error: 'Data de încheiere trebuie să fie în viitor.' }
    }

    // Preluăm prețul curent și pornirea din baza de date pentru a nu suprascrie ofertele existente
    const { data: currentTablou, error: fetchError } = await supabaseAdmin
      .from('tablouri')
      .select('pret_pornire, pret_curent')
      .eq('id', id)
      .single()

    if (fetchError || !currentTablou) {
      throw new Error('Tabloul nu a fost găsit pentru actualizare.')
    }

    // Dacă prețul din formular este egal cu prețul curent din DB, înseamnă că nu s-a modificat prețul,
    // caz în care păstrăm prețurile intacte (pentru a nu șterge/bloca ofertele curente).
    // Altfel, dacă prețul a fost editat la o altă valoare, resetăm prețul de pornire și cel curent la noua valoare.
    const pretPornireNou = pretPornire === currentTablou.pret_curent ? currentTablou.pret_pornire : pretPornire
    const pretCurentNou = pretPornire === currentTablou.pret_curent ? currentTablou.pret_curent : pretPornire

    // Dacă prețul a fost modificat de admin, ștergem toate ofertele existente pentru acest lot
    // (astfel resetăm istoricul licitației, deoarece prețul de pornire s-a schimbat).
    if (pretPornire !== currentTablou.pret_curent) {
      const { error: deleteBidsError } = await supabaseAdmin
        .from('oferte')
        .delete()
        .eq('tablou_id', id)
      
      if (deleteBidsError) throw new Error(`Eroare la ștergerea ofertelor vechi: ${deleteBidsError.message}`)
    }

    const { error } = await supabaseAdmin
      .from('tablouri')
      .update({
        titlu,
        autor,
        cod_lot: codLot.trim(),
        descriere,
        pret_pornire: pretPornireNou,
        pret_curent: pretCurentNou,
        data_limita: dateLimitaObj.toISOString()
      })
      .eq('id', id)

    if (error) throw error

    revalidatePath('/admin')
    revalidatePath('/user')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
