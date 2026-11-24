import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BookOpen, Search } from 'lucide-react';
import { VALUATION_CLASSES, type CoaReferencePayload } from '../types/sap.ts';

const PAGE_SIZE = 50;

export function CoaReferenceView() {
  const [reference, setReference] = useState<CoaReferencePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<'ALL' | number>('ALL');
  const [page, setPage] = useState(0);

  useEffect(() => {
    let active = true;
    fetch('/api/coa')
      .then(async (response) => {
        if (!response.ok) throw new Error('Gagal memuat master COA.');
        return (await response.json()) as CoaReferencePayload;
      })
      .then((payload) => {
        if (active) setReference(payload);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Gagal memuat master COA.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const codeVariants = useMemo(() => {
    const variants = new Map<string, Set<string>>();
    for (const account of reference?.accounts || []) {
      if (!variants.has(account.accountNumber)) variants.set(account.accountNumber, new Set());
      variants.get(account.accountNumber)?.add(account.name);
    }
    return variants;
  }, [reference]);

  const filteredAccounts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return (reference?.accounts || []).filter((account) => {
      if (selectedLevel !== 'ALL' && account.level !== selectedLevel) return false;
      if (!normalizedQuery) return true;
      return (
        account.accountNumber.toLocaleLowerCase().includes(normalizedQuery) ||
        account.name.toLocaleLowerCase().includes(normalizedQuery)
      );
    });
  }, [reference, query, selectedLevel]);

  const pageCount = Math.ceil(filteredAccounts.length / PAGE_SIZE);
  const currentAccounts = filteredAccounts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-5">
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-50 text-[#0064D9] rounded-md">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-slate-900">Master Chart of Accounts (COA)</h2>
            <p className="mt-1 text-xs text-slate-500">
              Referensi akun dari file {reference?.sourceFile || 'coa vdi.xlsx'} · {reference?.sourceRows.toLocaleString('id-ID') || '...'} baris sumber
            </p>
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Valuation class disederhanakan mengikuti COA: seluruh barang memakai 3100 → 1140100 (Persediaan Barang), sedangkan grup jasa memakai 3200 → 5140100. Nama akun 5140100 tercatat ganda di COA (Biaya Pembelian Jasa dan Training/Pelatihan), sehingga mapping jasa perlu konfirmasi Finance. Mapping ini belum menjalankan posting otomatis.
            </div>
          </div>
        </div>
      </section>

      {loading && (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-sm text-slate-500">
          Memuat master COA...
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-2 text-sm text-red-800">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {reference && !loading && !error && (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs text-slate-500">Kode akun unik</div>
              <div className="mt-1 text-xl font-bold font-mono text-slate-900">
                {reference.uniqueAccountCodes.toLocaleString('id-ID')}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs text-slate-500">Baris referensi unik</div>
              <div className="mt-1 text-xl font-bold font-mono text-slate-900">
                {reference.uniqueEntries.toLocaleString('id-ID')}
              </div>
            </div>
            <div className="bg-white border border-amber-200 rounded-lg p-4">
              <div className="text-xs text-amber-800">Kode dengan beberapa nama</div>
              <div className="mt-1 text-xl font-bold font-mono text-amber-900">
                {reference.ambiguousAccountCodes.toLocaleString('id-ID')}
              </div>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">Referensi GL per Valuation Class</h3>
              <p className="mt-1 text-xs text-slate-500">Akun referensi dari COA VDI yang ditampilkan pada master material dan customizing.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                    <th className="px-4 py-2.5">Valuation Class</th>
                    <th className="px-4 py-2.5">Nama</th>
                    <th className="px-4 py-2.5">GL Referensi</th>
                    <th className="px-4 py-2.5">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {VALUATION_CLASSES.map((valuationClass) => (
                    <tr key={valuationClass.bklas}>
                      <td className="px-4 py-2.5 font-mono font-semibold">{valuationClass.bklas}</td>
                      <td className="px-4 py-2.5">{valuationClass.label}</td>
                      <td className="px-4 py-2.5 font-mono">{valuationClass.glAccount} · {valuationClass.glAccountName}</td>
                      <td className="px-4 py-2.5 text-slate-500">{valuationClass.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <div className="relative flex-1 max-w-lg">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(0);
                  }}
                  placeholder="Cari nomor akun atau nama akun..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-[#0064D9]"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <label htmlFor="coa-level-filter">Level</label>
                <select
                  id="coa-level-filter"
                  value={selectedLevel}
                  onChange={(event) => {
                    setSelectedLevel(event.target.value === 'ALL' ? 'ALL' : Number(event.target.value));
                    setPage(0);
                  }}
                  className="px-2.5 py-2 bg-white border border-slate-200 rounded-md text-slate-700"
                >
                  <option value="ALL">Semua</option>
                  {[2, 3, 4, 5, 6].map((level) => (
                    <option key={level} value={level}>Level {level}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                    <th className="px-4 py-2.5 whitespace-nowrap">Nomor Akun</th>
                    <th className="px-4 py-2.5">Nama Akun</th>
                    <th className="px-4 py-2.5 text-center">Level</th>
                    <th className="px-4 py-2.5">Referensi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentAccounts.map((account, index) => {
                    const variants = codeVariants.get(account.accountNumber)?.size || 0;
                    return (
                      <tr key={`${account.accountNumber}-${account.level}-${account.name}-${index}`} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-mono font-semibold text-slate-800">{account.accountNumber}</td>
                        <td className="px-4 py-2.5 text-slate-700">{account.name}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-mono">{account.level}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          {variants > 1 ? (
                            <span className="text-amber-700">{variants} nama untuk kode ini</span>
                          ) : (
                            <span className="text-slate-400">Unik</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {currentAccounts.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500">Akun COA tidak ditemukan.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>
                Menampilkan {filteredAccounts.length ? page * PAGE_SIZE + 1 : 0}–{Math.min((page + 1) * PAGE_SIZE, filteredAccounts.length)} dari {filteredAccounts.length.toLocaleString('id-ID')} baris
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 0}
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  className="px-2.5 py-1.5 border border-slate-200 rounded disabled:opacity-40"
                >
                  Sebelumnya
                </button>
                <span>{pageCount ? page + 1 : 0}/{pageCount}</span>
                <button
                  type="button"
                  disabled={page + 1 >= pageCount}
                  onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
                  className="px-2.5 py-1.5 border border-slate-200 rounded disabled:opacity-40"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
