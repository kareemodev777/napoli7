export interface PromoCodeRow {
  code: string;
  discount_aed: string | number | null;
  discount_pct: string | number | null;
  min_subtotal_aed: string | number;
  valid_from: string | null;
  valid_until: string | null;
  max_uses: number | null;
  times_used: number;
  active: boolean;
  created_at: string;
}
