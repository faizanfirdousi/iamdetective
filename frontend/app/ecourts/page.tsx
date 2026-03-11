'use client';

import { useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Filter, Scale, Loader2, Landmark, Users, Calendar, BookOpen, Gavel } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface ECSearchCase {
  cnr: string;
  caseType: string;
  caseStatus: string;
  filingDate: string;
  nextHearingDate: string;
  judges: string[];
  petitioners: string[];
  respondents: string[];
  petitionerAdvocates: string[];
  respondentAdvocates: string[];
  actsAndSections: string[];
  courtCode: string;
  judicialSection: string;
  aiKeywords: string[];
}

function buildTitle(c: ECSearchCase): string {
  const pet = c.petitioners?.[0] || 'Unknown';
  const resp = c.respondents?.[0] || 'Unknown';
  let title = `${pet} vs ${resp}`;
  if ((c.petitioners?.length || 0) > 1 || (c.respondents?.length || 0) > 1) {
    title += ' & Ors.';
  }
  return title;
}

function ECourtsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [advocates, setAdvocates] = useState('');
  const [judges, setJudges] = useState('');
  const [caseStatus, setCaseStatus] = useState('all');
  const [results, setResults] = useState<ECSearchCase[]>([]);
  const [totalHits, setTotalHits] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [facets, setFacets] = useState<any>(null);

  const fetchCases = useCallback(async (q: string, adv: string, jdg: string, status: string, pg: number) => {
    if (!q.trim() && !adv.trim() && !jdg.trim()) return;
    setLoading(true);
    setFetchError(false);
    setHasSearched(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (adv) params.set('advocates', adv);
      if (jdg) params.set('judges', jdg);
      if (status && status !== 'all') params.set('caseStatuses', status);
      params.set('page', String(pg));
      params.set('pageSize', '20');

      const res = await fetch(`http://localhost:8080/api/v1/ecourts/search?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      const data = json.data || {};
      setResults(data.results || []);
      setTotalHits(data.totalHits || 0);
      setHasNextPage(data.hasNextPage || false);
      setFacets(data.facets || null);
    } catch (err) {
      console.error('Error fetching eCourts cases:', err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCases(query, advocates, judges, caseStatus, 1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchCases(query, advocates, judges, caseStatus, newPage);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'DISPOSED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'TRANSFERRED': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const statusBar = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-red-500';
      case 'DISPOSED': return 'bg-emerald-500';
      case 'TRANSFERRED': return 'bg-blue-500';
      default: return 'bg-zinc-500';
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-7xl animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Gavel className="w-8 h-8 text-amber-500" />
          <h1 className="text-4xl font-serif font-bold text-white tracking-wider">eCOURTS</h1>
        </div>
        <p className="text-zinc-500 mt-1 font-mono text-sm uppercase">
          Search 24Cr+ case records across all Indian courts — structured data, AI summaries & live status
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="space-y-4 mb-6">
        <div className="flex items-center bg-zinc-900/80 border border-zinc-800 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-amber-500 transition-all shadow-xl shadow-amber-900/5">
          <Search className="w-6 h-6 ml-4 text-zinc-500" />
          <Input
            type="text"
            placeholder='Search cases... (party name, act, keyword)'
            className="border-none bg-transparent text-lg h-14 px-4 focus-visible:ring-0 placeholder:text-zinc-600 text-white"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button type="submit" size="lg" className="h-14 px-8 rounded-none bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold whitespace-nowrap">
            Search
          </Button>
        </div>

        {/* Advanced Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input
            placeholder="Advocate name..."
            className="bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-amber-500 h-10"
            value={advocates}
            onChange={(e) => setAdvocates(e.target.value)}
          />
          <Input
            placeholder="Judge name..."
            className="bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-amber-500 h-10"
            value={judges}
            onChange={(e) => setJudges(e.target.value)}
          />
          <Select value={caseStatus} onValueChange={(v) => setCaseStatus(v ?? 'all')}>
            <SelectTrigger className="bg-zinc-900 border-zinc-800 focus:ring-amber-500 h-10">
              <SelectValue placeholder="Case Status" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-300">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING">🔴 Pending</SelectItem>
              <SelectItem value="DISPOSED">🟢 Disposed</SelectItem>
              <SelectItem value="TRANSFERRED">🔵 Transferred</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            type="submit"
            className="bg-amber-500 text-zinc-950 hover:bg-amber-400 font-semibold rounded-sm h-10"
          >
            <Filter className="w-4 h-4 mr-2" /> Search with Filters
          </Button>
        </div>
      </form>

      {/* Error */}
      {fetchError && (
        <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-md text-red-500 mb-8">
          Failed to fetch eCourts cases. Make sure the backend API is running and ECOURTS_API_TOKEN is set.
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <span className="ml-3 text-zinc-500 font-mono text-sm">Searching eCourts India...</span>
        </div>
      ) : !hasSearched ? (
        /* Empty state */
        <div className="text-center p-16 space-y-6">
          <Gavel className="w-16 h-16 text-zinc-700 mx-auto" />
          <div>
            <h2 className="text-2xl font-serif text-zinc-400 mb-2">Search Indian Court Records</h2>
            <p className="text-zinc-600 max-w-lg mx-auto">
              Access 24 crore+ case records with structured data — parties, judges, advocates,
              hearing dates, AI summaries, and live case status tracking.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {['murder', 'bail', 'land dispute', 'IPC 302', 'cheque bounce', 'divorce'].map((term) => (
              <button
                key={term}
                onClick={() => { setQuery(term); fetchCases(term, '', '', 'all', 1); }}
                className="px-3 py-1.5 text-sm font-mono bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-md hover:border-amber-500/50 hover:text-amber-400 transition-colors cursor-pointer"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Results Count + Facets */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-zinc-500 font-mono text-sm">
              {totalHits.toLocaleString()} records found — page {page}
            </span>
            {facets?.caseType && (
              <div className="flex gap-2">
                {Object.entries(facets.caseType.values || {}).slice(0, 4).map(([type, count]: [string, any]) => (
                  <Badge key={type} variant="outline" className="text-xs font-mono text-zinc-500 border-zinc-700">
                    {type}: {count}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Results */}
          <div className="grid grid-cols-1 space-y-4">
            {results.map((c) => (
              <Link href={`/ecourts/${c.cnr}`} key={c.cnr}>
                <Card className="bg-zinc-950 border-zinc-800 hover:border-amber-500/50 transition-all hover:bg-zinc-900/50 cursor-pointer group rounded-sm shadow-md">
                  <div className="flex items-center p-6 gap-6">
                    <div className={`w-1.5 self-stretch rounded-full ${statusBar(c.caseStatus)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <Badge variant="outline" className="font-mono text-xs text-zinc-500 border-zinc-700 bg-zinc-900">
                          CNR: {c.cnr}
                        </Badge>
                        <Badge className={`text-xs font-bold uppercase tracking-wider border ${statusColor(c.caseStatus)}`}>
                          {c.caseStatus}
                        </Badge>
                        <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-400 font-mono text-xs uppercase border border-indigo-500/20">
                          ⚖️ eCourts
                        </Badge>
                        <Badge variant="outline" className="text-xs font-mono text-zinc-600 border-zinc-800">
                          {c.caseType}
                        </Badge>
                      </div>

                      <h2 className="text-xl font-serif text-zinc-100 group-hover:text-amber-400 transition-colors line-clamp-2">
                        {buildTitle(c)}
                      </h2>

                      <div className="flex items-center gap-6 mt-3 text-sm text-zinc-500 font-mono flex-wrap">
                        {c.filingDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Filed: {c.filingDate}
                          </span>
                        )}
                        {c.nextHearingDate && (
                          <span className="flex items-center gap-1 text-amber-500/80">
                            <Calendar className="w-3.5 h-3.5" />
                            Next: {c.nextHearingDate}
                          </span>
                        )}
                        {c.judges?.[0] && (
                          <span className="flex items-center gap-1">
                            <Scale className="w-3.5 h-3.5" />
                            {c.judges[0]}
                          </span>
                        )}
                      </div>

                      {c.aiKeywords && c.aiKeywords.length > 0 && (
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {c.aiKeywords.slice(0, 4).map((kw, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded">
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}

            {results.length === 0 && !fetchError && (
              <div className="text-zinc-500 text-center p-8 bg-zinc-900/50 border border-zinc-800 rounded-md">
                No eCourts cases found. Try a different query.
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button
              variant="outline"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="border-zinc-700 text-zinc-400 hover:text-amber-400 disabled:opacity-30"
            >
              ← Previous
            </Button>
            <span className="text-zinc-500 font-mono text-sm">Page {page}</span>
            <Button
              variant="outline"
              onClick={() => handlePageChange(page + 1)}
              disabled={!hasNextPage}
              className="border-zinc-700 text-zinc-400 hover:text-amber-400 disabled:opacity-30"
            >
              Next →
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default function ECourtsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    }>
      <ECourtsInner />
    </Suspense>
  );
}
