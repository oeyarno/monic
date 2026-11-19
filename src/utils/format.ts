export function formatCurrency(amount: number, currency = 'IDR'): string {
  if (currency === 'IDR') {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(val: number): string {
  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 2,
  }).format(val);
}

export function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function getMaterialStatusLabel(mstae: string): {
  label: string;
  tone: 'nominal' | 'warning' | 'danger';
} {
  if (mstae === '01') return { label: 'Blokir Pengadaan (01)', tone: 'warning' };
  if (mstae === '02') return { label: 'Diblokir Total (02)', tone: 'danger' };
  if (mstae === 'Z1') return { label: 'Obsolete / Non-Aktif (Z1)', tone: 'warning' };
  return { label: 'Aktif', tone: 'nominal' };
}
