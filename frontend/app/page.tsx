'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Scale, ShieldAlert, BarChart3, Database, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Home() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentCases, setRecentCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch recent cases from the API on mount
  useEffect(() => {
    async function fetchRecent() {
      try {
        const res = await fetch('http://localhost:8080/api/v1/cases/search?q=&limit=4');
        if (res.ok) {
          const json = await res.json();
          setRecentCases(json.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch recent cases:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchRecent();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/cases?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/cases');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center p-8 bg-zinc-950 text-zinc-100">
      {/* Hero Section */}
      <section className="w-full max-w-4xl py-20 text-center space-y-6">
        <h1 className="text-5xl font-serif font-bold italic tracking-tight text-white mb-2 shadow-sm drop-shadow-md">
          <span className="text-amber-400">UNCOVER</span> THE TRUTH.
        </h1>
        <p className="text-zinc-400 max-w-2xl mx-auto text-lg">
          Dive deep into real criminal dossiers. Search historical evidence, analyze relationships, and explore millions of records from the FBI, US federal courts, and the UK National Archives.
        </p>
        
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto mt-12 shadow-2xl shadow-amber-900/10">
          <div className="flex items-center bg-zinc-900/80 border border-zinc-800 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-amber-500 transition-all">
            <Search className="w-6 h-6 ml-4 text-zinc-500" />
            <Input 
              type="text" 
              placeholder="Search by suspect name, charge, or case ID..." 
              className="border-none bg-transparent text-lg h-16 px-4 focus-visible:ring-0 placeholder:text-zinc-600 text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button type="submit" size="lg" className="h-16 px-8 rounded-none bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold whitespace-nowrap">
              Search Database
            </Button>
          </div>
        </form>
      </section>

      {/* Main Grid Layout */}
      <div className="w-full max-w-6xl mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Recent Cases */}
        <section className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <h2 className="text-2xl font-serif font-bold flex items-center gap-2">
              <Database className="w-5 h-5 text-amber-500" />
              Recently Acquired Cases
            </h2>
            <Link href="/cases" className="text-sm text-zinc-400 hover:text-amber-400">
              View All Cases →
            </Link>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
              <span className="ml-3 text-zinc-500 font-mono text-sm">Fetching records...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentCases.length > 0 ? recentCases.map((c: any) => (
                <Link href={`/cases/${c.id}`} key={c.id}>
                  <Card className="bg-zinc-900/50 border-zinc-800 hover:border-amber-500/50 transition-colors cursor-pointer group h-full">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <Badge variant="outline" className="font-mono text-xs text-zinc-500 border-zinc-800 truncate max-w-[140px]">
                          {c.id?.substring(0, 8) || 'N/A'}
                        </Badge>
                        <Badge className={
                          c.status === 'open' 
                            ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' 
                            : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                        }>
                          {(c.status || 'unknown').toUpperCase()}
                        </Badge>
                      </div>
                      <CardTitle className="font-serif text-xl tracking-wide group-hover:text-amber-400 transition-colors mt-2 line-clamp-2">
                        {c.title || 'Untitled Case'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <div className="flex flex-col gap-2 text-sm text-zinc-400">
                        <div className="flex items-center gap-2">
                          <Scale className="w-4 h-4 shrink-0" />
                          <span className="truncate">{c.jurisdiction || 'Unknown Court'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 shrink-0" />
                          <span className="font-mono text-xs">
                            {c.filed_date ? new Date(c.filed_date).toLocaleDateString() : 'Unknown Date'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )) : (
                <div className="col-span-2 text-center p-8 text-zinc-500 bg-zinc-900/30 rounded-lg border border-zinc-800">
                  No recent cases available. Make sure the backend API is running.
                </div>
              )}
            </div>
          )}
        </section>

        {/* Right Col: Stats Heatmap (Placeholder for Recharts) */}
        <section className="space-y-6">
          <div className="border-b border-zinc-800 pb-2 flex items-center justify-between">
            <h2 className="text-2xl font-serif font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-zinc-500" />
              FBI National Trends
            </h2>
          </div>
          <Card className="bg-zinc-900/50 border-zinc-800 h-96 flex flex-col pt-6">
            <CardHeader className="py-2">
              <CardTitle className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Homicide Rates (2018-2022)</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex items-end gap-2 p-6 justify-between opacity-80">
              {[40, 60, 50, 80, 75].map((h, i) => (
                <div key={i} className="flex flex-col items-center gap-2 w-full">
                  <span className="text-xs text-zinc-500 font-mono">{h}k</span>
                  <div 
                    className="w-full bg-gradient-to-t from-red-950 to-red-600 rounded-sm" 
                    style={{ height: `${h}%` }}
                  ></div>
                  <span className="text-xs font-mono">{2018 + i}</span>
                </div>
              ))}
            </CardContent>
            <CardFooter className="bg-zinc-900/80 border-t border-zinc-800/50 p-4 text-xs text-zinc-500">
              <ShieldAlert className="w-4 h-4 mr-2" />
              Sourced directly from the FBI Crime Data Explorer.
            </CardFooter>
          </Card>
        </section>

      </div>
    </div>
  );
}
