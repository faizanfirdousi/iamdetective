'use client';

import { useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Filter, Scale, Loader2, Landmark, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

function IndianCasesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQuery = searchParams.get('q') || '';
  const initialCourt = searchParams.get('court') || 'all';

  const [searchInput, setSearchInput] = useState(initialQuery);
  const [court, setCourt] = useState(initialCourt);
  const [casesData, setCasesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [totalFound, setTotalFound] = useState('');
  const [pageNum, setPageNum] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);

  const fetchCases = useCallback(async (query: string, courtFilter: string, page: number) => {
    if (!query.trim()) return;
    setLoading(true);
    setFetchError(false);
    setHasSearched(true);
    try {
      let url = `http://localhost:8080/api/v1/indian-cases/search?q=${encodeURIComponent(query)}&pagenum=${page}`;
      if (courtFilter && courtFilter !== 'all') url += `&court=${encodeURIComponent(courtFilter)}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setCasesData(json.data || []);
      setTotalFound(json.meta?.found || '');
    } catch (err) {
      console.error('Error fetching Indian cases:', err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPageNum(0);
    const params = new URLSearchParams();
    if (searchInput) params.set('q', searchInput);
    if (court && court !== 'all') params.set('court', court);
    router.push(`/indian-cases?${params.toString()}`);
    fetchCases(searchInput, court, 0);
  };

  const handleNextPage = () => {
    const next = pageNum + 1;
    setPageNum(next);
    fetchCases(searchInput, court, next);
  };

  const handlePrevPage = () => {
    if (pageNum <= 0) return;
    const prev = pageNum - 1;
    setPageNum(prev);
    fetchCases(searchInput, court, prev);
  };

  // Extract IK doc TID from tags array
  const getDocId = (c: any): string => {
    if (c.tags) {
      const tidTag = c.tags.find((t: string) => t.startsWith('ik_tid:'));
      if (tidTag) return tidTag.replace('ik_tid:', '');
    }
    return c.id;
  };

  return (
    <div className="container mx-auto p-8 max-w-7xl animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Landmark className="w-8 h-8 text-amber-500" />
            <h1 className="text-4xl font-serif font-bold text-white tracking-wider">INDIAN CASES</h1>
          </div>
          <p className="text-zinc-500 mt-1 font-mono text-sm uppercase">
            Search Indian law via Indian Kanoon — Supreme Court, High Courts & Tribunals
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex items-center bg-zinc-900/80 border border-zinc-800 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-amber-500 transition-all shadow-xl shadow-amber-900/5">
          <Search className="w-6 h-6 ml-4 text-zinc-500" />
          <Input
            type="text"
            placeholder='Search Indian judgments... (e.g. "freedom of speech", murder, dowry death)'
            className="border-none bg-transparent text-lg h-14 px-4 focus-visible:ring-0 placeholder:text-zinc-600 text-white"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Button type="submit" size="lg" className="h-14 px-8 rounded-none bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold whitespace-nowrap">
            Search
          </Button>
        </div>
      </form>

      {/* Filters */}
      <Card className="bg-zinc-900/40 border-zinc-800 mb-8 rounded-md">
        <CardContent className="p-4 flex flex-wrap gap-4 items-center">
          <Filter className="w-5 h-5 text-zinc-500 ml-2 mr-2" />

          <Select value={court} onValueChange={(v) => setCourt(v ?? 'all')}>
            <SelectTrigger className="w-[220px] bg-zinc-950 border-zinc-800 focus:ring-amber-500">
              <SelectValue placeholder="Court Type" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-300 max-h-80">
              <SelectItem value="all">All Courts</SelectItem>

              {/* Supreme Court */}
              <SelectItem value="supremecourt">🏛️ Supreme Court of India</SelectItem>

              {/* High Courts */}
              <SelectItem value="delhi">Delhi High Court</SelectItem>
              <SelectItem value="bombay">Bombay High Court</SelectItem>
              <SelectItem value="kolkata">Calcutta High Court</SelectItem>
              <SelectItem value="chennai">Madras High Court</SelectItem>
              <SelectItem value="allahabad">Allahabad High Court</SelectItem>
              <SelectItem value="karnataka">Karnataka High Court</SelectItem>
              <SelectItem value="kerala">Kerala High Court</SelectItem>
              <SelectItem value="gujarat">Gujarat High Court</SelectItem>
              <SelectItem value="punjab">Punjab & Haryana High Court</SelectItem>
              <SelectItem value="rajasthan">Rajasthan High Court</SelectItem>
              <SelectItem value="andhra">AP / Telangana High Court</SelectItem>
              <SelectItem value="madhyapradesh">MP High Court</SelectItem>
              <SelectItem value="patna">Patna High Court</SelectItem>
              <SelectItem value="gauhati">Gauhati High Court</SelectItem>
              <SelectItem value="jharkhand">Jharkhand High Court</SelectItem>
              <SelectItem value="uttaranchal">Uttarakhand High Court</SelectItem>
              <SelectItem value="himachal_pradesh">HP High Court</SelectItem>
              <SelectItem value="chattisgarh">Chhattisgarh High Court</SelectItem>
              <SelectItem value="sikkim">Sikkim High Court</SelectItem>

              {/* Tribunals */}
              <SelectItem value="tribunals">⚖️ All Tribunals</SelectItem>
              <SelectItem value="itat">ITAT</SelectItem>
              <SelectItem value="consumer">Consumer Forums</SelectItem>
              <SelectItem value="cci">CCI</SelectItem>
              <SelectItem value="greentribunal">NGT (Green Tribunal)</SelectItem>
              <SelectItem value="tdsat">TDSAT</SelectItem>
            </SelectContent>
          </Select>

          <div className="ml-auto flex items-center gap-3">
            {totalFound && (
              <span className="text-zinc-500 font-mono text-sm">{totalFound}</span>
            )}
            <Button 
              onClick={() => { setPageNum(0); fetchCases(searchInput, court, 0); }}
              className="bg-amber-500 text-zinc-950 hover:bg-amber-400 font-semibold rounded-sm"
            >
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {fetchError && (
        <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-md text-red-500 mb-8">
          Failed to fetch Indian cases. Make sure the backend API is running and your INDIANKANOON_API_TOKEN is set.
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <span className="ml-3 text-zinc-500 font-mono text-sm">Querying Indian Kanoon...</span>
        </div>
      ) : !hasSearched ? (
        /* Empty state before any search */
        <div className="text-center p-16 space-y-6">
          <BookOpen className="w-16 h-16 text-zinc-700 mx-auto" />
          <div>
            <h2 className="text-2xl font-serif text-zinc-400 mb-2">Search Indian Law</h2>
            <p className="text-zinc-600 max-w-lg mx-auto">
              Search through millions of Indian court judgments spanning the Supreme Court, 
              High Courts, District Courts, and Tribunals. Powered by Indian Kanoon.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {['murder', 'right to privacy', 'bail', 'dowry death', 'Section 498A', 'Article 21'].map((term) => (
              <button
                key={term}
                onClick={() => { setSearchInput(term); fetchCases(term, court, 0); }}
                className="px-3 py-1.5 text-sm font-mono bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-md hover:border-amber-500/50 hover:text-amber-400 transition-colors cursor-pointer"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Results */
        <>
          <div className="grid grid-cols-1 space-y-4">
            {casesData.map((c: any) => {
              const docId = getDocId(c);
              return (
                <Link href={`/indian-cases/${docId}`} key={c.id}>
                  <Card className="bg-zinc-950 border-zinc-800 hover:border-amber-500/50 transition-all hover:bg-zinc-900/50 cursor-pointer group rounded-sm shadow-md">
                    <div className="flex items-center p-6 gap-6">
                      {/* Saffron accent bar for Indian cases */}
                      <div className="w-1.5 self-stretch rounded-full bg-orange-500" />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant="outline" className="font-mono text-xs text-zinc-500 border-zinc-700 bg-zinc-900 truncate max-w-[200px]">
                            DOC: {docId}
                          </Badge>
                          <Badge variant="secondary" className="bg-orange-500/10 text-orange-400 font-mono text-xs uppercase border border-orange-500/20">
                            🇮🇳 Indian Kanoon
                          </Badge>
                        </div>
                        <h2 
                          className="text-xl font-serif text-zinc-100 group-hover:text-amber-400 transition-colors line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: c.title || 'Unknown Case' }}
                        />
                        <div className="flex items-center gap-6 mt-3 text-sm text-zinc-500 font-mono">
                          <span className="flex items-center gap-2">
                            <Scale className="w-4 h-4 text-zinc-600" />
                            {c.jurisdiction || 'Unknown Court'}
                          </span>
                        </div>
                        {c.summary && (
                          <p 
                            className="mt-3 text-sm text-zinc-500 line-clamp-2"
                            dangerouslySetInnerHTML={{ __html: c.summary }}
                          />
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
            {casesData.length === 0 && !fetchError && (
              <div className="text-zinc-500 text-center p-8 bg-zinc-900/50 border border-zinc-800 rounded-md">
                No Indian cases found for this search. Try a different query.
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button
              variant="outline"
              onClick={handlePrevPage}
              disabled={pageNum <= 0}
              className="border-zinc-700 text-zinc-400 hover:text-amber-400 disabled:opacity-30"
            >
              ← Previous
            </Button>
            <span className="text-zinc-500 font-mono text-sm">Page {pageNum + 1}</span>
            <Button
              variant="outline"
              onClick={handleNextPage}
              disabled={casesData.length === 0}
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

export default function IndianCases() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    }>
      <IndianCasesInner />
    </Suspense>
  );
}
