export interface Oferta {
  id: number;
  tablou_id: string;
  user_id: string | null;
  nume_utilizator: string;
  telefon: string;
  suma: number;
  created_at: string;
}

export interface Tablou {
  id: string;
  cod_lot: string | null;
  titlu: string;
  autor: string;
  descriere: string | null;
  imagine_url: string;
  pret_pornire: number;
  pret_curent: number;
  data_limita: string;
  status: 'draft' | 'active' | 'completed';
  created_at?: string;
  oferte?: Oferta[];
}
