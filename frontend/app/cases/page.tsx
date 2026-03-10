'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Filter, CalendarDays, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

function CasesListInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read initial values from URL
  const initialQuery = searchParams.get('q') || '';
  const initialJurisdiction = searchParams.get('jurisdiction') || 'all';
  const initialStatus = searchParams.get('status') || 'all';

  const [searchInput, setSearchInput] = useState(initialQuery);
  const [jurisdiction, setJurisdiction] = useState(initialJurisdiction);
  const [status, setStatus] = useState(initialStatus);
  const [casesData, setCasesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const fetchCases = useCallback(async (query: string, juris: string, stat: string) => {
    setLoading(true);
    setFetchError(false);
    try {
      let url = `http://localhost:8080/api/v1/cases/search?q=${encodeURIComponent(query)}`;
      if (juris && juris !== 'all') url += `&jurisdiction=${encodeURIComponent(juris)}`;
      if (stat && stat !== 'all') url += `&status=${encodeURIComponent(stat)}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setCasesData(json.data || []);
    } catch (err) {
      console.error('Error fetching cases:', err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and when URL params change
  useEffect(() => {
    const q = searchParams.get('q') || '';
    const j = searchParams.get('jurisdiction') || 'all';
    const s = searchParams.get('status') || 'all';
    setSearchInput(q);
    setJurisdiction(j);
    setStatus(s);
    fetchCases(q, j, s);
  }, [searchParams, fetchCases]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateURL(searchInput, jurisdiction, status);
  };

  const handleApplyFilters = () => {
    updateURL(searchInput, jurisdiction, status);
  };

  const updateURL = (q: string, juris: string, stat: string) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (juris && juris !== 'all') params.set('jurisdiction', juris);
    if (stat && stat !== 'all') params.set('status', stat);
    router.push(`/cases?${params.toString()}`);
  };

  return (
    <div className="container mx-auto p-8 max-w-7xl animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-serif font-bold text-white tracking-wider">DATABASE</h1>
          <p className="text-zinc-500 mt-2 font-mono text-sm uppercase">
            {loading ? 'Searching...' : `Showing ${casesData.length} records`}
          </p>
        </div>
        
        {/* Quick Search */}
        <form onSubmit={handleSearch} className="flex w-full md:w-auto items-center gap-2">
          <Input 
            placeholder="Search cases..." 
            className="w-full md:w-64 bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-amber-500 h-10"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Button type="submit" variant="outline" className="h-10 border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-amber-500">
            <Search className="w-4 h-4" />
          </Button>
        </form>
      </div>

      {/* Filter Ribbon */}
      <Card className="bg-zinc-900/40 border-zinc-800 mb-8 rounded-md">
        <CardContent className="p-4 flex flex-wrap gap-4 items-center">
          <Filter className="w-5 h-5 text-zinc-500 ml-2 mr-4" />
          
          <Select value={jurisdiction} onValueChange={(v) => setJurisdiction(v ?? 'all')}>
            <SelectTrigger className="w-[180px] bg-zinc-950 border-zinc-800 focus:ring-amber-500">
              <SelectValue placeholder="Jurisdiction" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-300">
              <SelectItem value="all">Any Jurisdiction</SelectItem>
              <SelectItem value="federal">US Federal Courts</SelectItem>
              <SelectItem value="uk">UK Crown Courts</SelectItem>
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={(v) => setStatus(v ?? 'all')}>
            <SelectTrigger className="w-[150px] bg-zinc-950 border-zinc-800 focus:ring-amber-500">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-300">
              <SelectItem value="all">Any Status</SelectItem>
              <SelectItem value="open" className="text-red-500">Open Cases</SelectItem>
              <SelectItem value="closed" className="text-emerald-500">Closed Cases</SelectItem>
            </SelectContent>
          </Select>

          <div className="ml-auto">
            <Button 
              onClick={handleApplyFilters}
              className="bg-amber-500 text-zinc-950 hover:bg-amber-400 font-semibold rounded-sm"
            >
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {fetchError && (
        <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-md text-red-500 mb-8">
          Failed to fetch cases from the database. Make sure the backend API is running.
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <span className="ml-3 text-zinc-500 font-mono text-sm">Querying database...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 space-y-4">
          {casesData.map((c: any) => (
            <Link href={`/cases/${c.id}`} key={c.id}>
              <Card className="bg-zinc-950 border-zinc-800 hover:border-amber-500/50 transition-all hover:bg-zinc-900/50 cursor-pointer group rounded-sm shadow-md">
                <div className="flex items-center p-6 gap-6">
                  
                  {/* Status Indicator Bar */}
                  <div className={`w-1.5 self-stretch rounded-full ${c.status === 'open' ? 'bg-red-500' : 'bg-emerald-500'}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="outline" className="font-mono text-xs text-zinc-500 border-zinc-700 bg-zinc-900 truncate max-w-[200px]">
                        ID: {c.id?.substring(0, 8) || 'Unknown'}
                      </Badge>
                      <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 font-mono text-xs uppercase">
                        {c.source || 'courtlistener'}
                      </Badge>
                    </div>
                    <h2 className="text-2xl font-serif text-zinc-100 truncate group-hover:text-amber-400 transition-colors">
                      {c.title || c.case_name || 'Unknown Case'}
                    </h2>
                    <div className="flex items-center gap-6 mt-3 text-sm text-zinc-500 font-mono">
                      <span className="flex items-center gap-2">
                        <span className="text-zinc-600">Filed:</span> 
                        {c.filed_date ? new Date(c.filed_date).toLocaleDateString() : 'N/A'}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="text-zinc-600">Court:</span> 
                        {c.jurisdiction || 'Unknown Court'}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <Badge variant="outline" className={`ml-auto font-bold uppercase tracking-wider ${
                      c.status === 'open' ? 'text-red-500 border-red-500/30' : 'text-emerald-500 border-emerald-500/30'
                    }`}>
                      {c.status || 'UNKNOWN'}
                    </Badge>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
          {casesData.length === 0 && !fetchError && (
            <div className="text-zinc-500 text-center p-8 bg-zinc-900/50 border border-zinc-800 rounded-md">
              No cases found. Try a different search query.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CasesList() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    }>
      <CasesListInner />
    </Suspense>
  );
}
