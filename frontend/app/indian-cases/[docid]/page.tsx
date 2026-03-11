'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  FileText, Scale, Landmark, Search, Calendar, Shield, BookOpen,
  Clock, AlertTriangle, ArrowLeft, Loader2, ExternalLink, Quote
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CiteEntry {
  tid: number;
  title: string;
}

interface DocMeta {
  tid: number;
  title: string;
  author: string;
  bench: string;
  docsource: string;
  citeList: CiteEntry[];
  citedbyList: CiteEntry[];
}

export default function IndianCaseDossier() {
  const params = useParams();
  const docId = params.docid as string;

  const [dossier, setDossier] = useState<any>(null);
  const [meta, setMeta] = useState<DocMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [metaLoading, setMetaLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  // Fetch document
  useEffect(() => {
    async function fetchDoc() {
      try {
        const res = await fetch(`http://localhost:8080/api/v1/indian-cases/${docId}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setDossier(json.data);
      } catch (err) {
        console.error('Error fetching Indian case:', err);
        setFetchError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchDoc();
  }, [docId]);

  // Fetch metadata (citations, bench, author)
  useEffect(() => {
    async function fetchMeta() {
      try {
        const res = await fetch(`http://localhost:8080/api/v1/indian-cases/${docId}/meta`);
        if (!res.ok) throw new Error('Failed to fetch meta');
        const json = await res.json();
        setMeta(json.data);
      } catch (err) {
        console.error('Error fetching Indian case meta:', err);
      } finally {
        setMetaLoading(false);
      }
    }
    fetchMeta();
  }, [docId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        <span className="ml-3 text-zinc-500 font-mono text-sm">Loading Indian case dossier...</span>
      </div>
    );
  }

  if (fetchError || !dossier) {
    return (
      <div className="flex bg-zinc-950 text-zinc-100 min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h1 className="text-2xl font-serif text-white">Indian Case Dossier Unavailable</h1>
          <p className="text-zinc-500">The requested document could not be retrieved from Indian Kanoon.</p>
          <Link href="/indian-cases">
            <Button variant="outline" className="mt-4 border-zinc-700 text-zinc-300 hover:text-amber-500">
              <ArrowLeft className="w-4 h-4 mr-2" /> Return to Indian Cases
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const title = dossier.title || 'Unknown Case';
  const court = meta?.docsource || dossier.jurisdiction || 'Indian Court';
  const author = meta?.author || '';
  const bench = meta?.bench || '';
  const fullText = dossier.full_text || 'No judgment text available.';
  const sourceURL = dossier.source_url || `https://indiankanoon.org/doc/${docId}/`;

  return (
    <div className="flex bg-zinc-950 text-zinc-100 min-h-[calc(100vh-3.5rem)] animate-in slide-in-from-bottom-2 duration-500">
      <div className="flex-1 overflow-auto p-8 lg:p-12">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <header className="border-b border-zinc-800 pb-8 mb-8">
            <Link href="/indian-cases" className="inline-flex items-center text-sm font-mono text-zinc-500 hover:text-amber-500 mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Indian Cases
            </Link>

            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <Badge className="font-mono text-sm bg-zinc-900 border border-zinc-700 text-zinc-400">
                DOC ID: {docId}
              </Badge>
              <Badge className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-3 uppercase tracking-wider font-bold flex items-center gap-1">
                🇮🇳 Indian Kanoon
              </Badge>
            </div>

            <h1 
              className="text-3xl lg:text-4xl font-serif font-bold text-white tracking-wide mb-6"
              dangerouslySetInnerHTML={{ __html: title }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm text-zinc-400 font-mono bg-zinc-900/40 p-6 rounded-md border border-zinc-800">
              <div className="flex items-center gap-3">
                <Scale className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-zinc-600 uppercase text-xs">Court</p>
                  <p className="text-zinc-200">{court}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Landmark className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-zinc-600 uppercase text-xs">Location</p>
                  <p className="text-zinc-200">India</p>
                </div>
              </div>
              {author && (
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="text-zinc-600 uppercase text-xs">Author</p>
                    <p className="text-zinc-200">{author}</p>
                  </div>
                </div>
              )}
            </div>

            {bench && (
              <div className="mt-4 p-3 bg-zinc-900/30 border border-zinc-800 rounded-md">
                <span className="text-zinc-600 text-xs uppercase font-mono">Bench: </span>
                <span className="text-zinc-300 text-sm">{bench}</span>
              </div>
            )}
          </header>

          {/* Dossier Tabs */}
          <Tabs defaultValue="judgment" className="w-full flex-col">
            <TabsList className="bg-transparent border-b border-zinc-800 w-full justify-start rounded-none h-12 mb-8 p-0 gap-8 overflow-x-auto overflow-y-hidden">
              <TabsTrigger value="judgment" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-amber-500 data-[state=active]:text-amber-500 rounded-none h-full text-zinc-400 text-sm font-semibold uppercase tracking-wider px-0 shrink-0">
                <BookOpen className="w-4 h-4 mr-2" /> Judgment
              </TabsTrigger>
              <TabsTrigger value="citations" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-amber-500 data-[state=active]:text-amber-500 rounded-none h-full text-zinc-400 text-sm font-semibold uppercase tracking-wider px-0 shrink-0">
                <Quote className="w-4 h-4 mr-2" /> Citations
              </TabsTrigger>
              <TabsTrigger value="source" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-amber-500 data-[state=active]:text-amber-500 rounded-none h-full text-zinc-400 text-sm font-semibold uppercase tracking-wider px-0 shrink-0">
                <ExternalLink className="w-4 h-4 mr-2" /> Source
              </TabsTrigger>
            </TabsList>

            {/* Judgment Tab — Full Text */}
            <TabsContent value="judgment" className="space-y-6 animate-in fade-in duration-300">
              <div 
                className="bg-zinc-950 border border-zinc-800 rounded-lg p-6 lg:p-8 text-base leading-relaxed text-zinc-300 selection:bg-amber-500/30 selection:text-amber-200 shadow-inner max-h-[800px] overflow-y-auto prose prose-invert prose-sm max-w-none [&_a]:text-amber-500 [&_a]:underline [&_b]:text-white [&_p]:mb-3"
                dangerouslySetInnerHTML={{ __html: fullText }}
              />
            </TabsContent>

            {/* Citations Tab */}
            <TabsContent value="citations" className="space-y-8 animate-in fade-in duration-300">
              {metaLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                  <span className="ml-3 text-zinc-500 font-mono text-sm">Loading citations...</span>
                </div>
              ) : (
                <>
                  {/* Cases this document cites */}
                  <section>
                    <h3 className="text-lg font-serif font-bold text-zinc-300 mb-4 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-amber-500" />
                      Cases Cited ({meta?.citeList?.length || 0})
                    </h3>
                    {meta?.citeList && meta.citeList.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3">
                        {meta.citeList.map((cite) => (
                          <Link href={`/indian-cases/${cite.tid}`} key={cite.tid}>
                            <Card className="bg-zinc-900/50 border-zinc-800 hover:border-amber-500/50 transition-colors cursor-pointer p-4">
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="font-mono text-xs text-zinc-500 border-zinc-700 shrink-0">
                                  {cite.tid}
                                </Badge>
                                <span className="text-zinc-300 text-sm truncate">{cite.title}</span>
                              </div>
                            </Card>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="text-zinc-600 text-sm font-mono">No outgoing citations found.</p>
                    )}
                  </section>

                  {/* Cases that cite this document */}
                  <section>
                    <h3 className="text-lg font-serif font-bold text-zinc-300 mb-4 flex items-center gap-2">
                      <Quote className="w-5 h-5 text-amber-500" />
                      Cited By ({meta?.citedbyList?.length || 0})
                    </h3>
                    {meta?.citedbyList && meta.citedbyList.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3">
                        {meta.citedbyList.map((cite) => (
                          <Link href={`/indian-cases/${cite.tid}`} key={cite.tid}>
                            <Card className="bg-zinc-900/50 border-zinc-800 hover:border-amber-500/50 transition-colors cursor-pointer p-4">
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="font-mono text-xs text-zinc-500 border-zinc-700 shrink-0">
                                  {cite.tid}
                                </Badge>
                                <span className="text-zinc-300 text-sm truncate">{cite.title}</span>
                              </div>
                            </Card>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="text-zinc-600 text-sm font-mono">No citing documents found.</p>
                    )}
                  </section>
                </>
              )}
            </TabsContent>

            {/* Source Tab */}
            <TabsContent value="source" className="animate-in fade-in duration-300">
              <div className="space-y-4">
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="font-serif text-lg text-zinc-200 flex items-center gap-2">
                      <ExternalLink className="w-5 h-5 text-amber-500" />
                      Original Document
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-zinc-400 text-sm">Source document from Indian Kanoon</p>
                    <a
                      href={sourceURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-amber-500 hover:text-amber-400 font-mono text-sm underline underline-offset-4"
                    >
                      View on Indian Kanoon →
                    </a>
                    <div className="mt-3 p-3 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-500 font-mono break-all">
                      {sourceURL}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
