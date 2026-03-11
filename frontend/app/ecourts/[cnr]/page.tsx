'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Scale, Landmark, FileText, Users, Calendar, Gavel,
  AlertTriangle, ArrowLeft, Loader2, ExternalLink, Brain,
  Clock, BookOpen, ChevronRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CaseData {
  courtCaseData: {
    cnr: string;
    caseNumber: string;
    caseType: string;
    caseStatus: string;
    filingDate: string;
    registrationDate: string;
    firstHearingDate: string;
    nextHearingDate: string;
    decisionDate: string | null;
    judges: string[];
    petitioners: string[];
    petitionerAdvocates: string[];
    respondents: string[];
    respondentAdvocates: string[];
    actsAndSections: string;
    courtName: string;
    state: string;
    district: string;
    courtNo: number;
    benchName: string;
    purpose: string;
    judicialSection: string;
  };
  entityInfo: {
    cnr: string;
    nextDateOfHearing: string;
    dateCreated: string;
    dateModified: string;
  };
  files: {
    files: Array<{
      pdfFile: string;
      markdownContent: string;
      aiAnalysis: {
        summary: string;
        orderType: string;
        outcome: string;
        keyPoints: string[];
        reliefGranted: string[];
        legalProvisions: string[];
      } | null;
    }>;
  };
  caseAiAnalysis: {
    caseSummary: string;
    caseType: string;
    complexity: string;
    keyIssues: string[];
  } | null;
}

export default function ECourtsCaseDossier() {
  const params = useParams();
  const cnr = params.cnr as string;

  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    async function fetchCase() {
      try {
        const res = await fetch(`http://localhost:8080/api/v1/ecourts/case/${cnr}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setCaseData(json.data);
      } catch (err) {
        console.error('Error fetching eCourts case:', err);
        setFetchError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchCase();
  }, [cnr]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        <span className="ml-3 text-zinc-500 font-mono text-sm">Loading case dossier...</span>
      </div>
    );
  }

  if (fetchError || !caseData) {
    return (
      <div className="flex bg-zinc-950 text-zinc-100 min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h1 className="text-2xl font-serif text-white">Case Dossier Unavailable</h1>
          <p className="text-zinc-500">CNR: {cnr} could not be retrieved.</p>
          <Link href="/ecourts">
            <Button variant="outline" className="mt-4 border-zinc-700 text-zinc-300 hover:text-amber-500">
              <ArrowLeft className="w-4 h-4 mr-2" /> Return to eCourts
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const d = caseData.courtCaseData;
  const ai = caseData.caseAiAnalysis;
  const files = caseData.files?.files || [];

  // Build title
  const pet = d.petitioners?.[0] || 'Unknown';
  const resp = d.respondents?.[0] || 'Unknown';
  let title = `${pet} vs ${resp}`;
  if ((d.petitioners?.length || 0) > 1 || (d.respondents?.length || 0) > 1) title += ' & Ors.';

  const statusColor = d.caseStatus === 'PENDING'
    ? 'bg-red-500/10 text-red-500 border-red-500/20'
    : d.caseStatus === 'DISPOSED'
    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
    : 'bg-blue-500/10 text-blue-400 border-blue-500/20';

  const complexityColor = (c: string) => {
    switch (c) {
      case 'HIGH': return 'text-red-400';
      case 'MEDIUM': return 'text-amber-400';
      case 'LOW': return 'text-emerald-400';
      default: return 'text-zinc-400';
    }
  };

  // Build timeline events from available dates
  const timelineEvents: { label: string; date: string; color: string }[] = [];
  if (d.filingDate) timelineEvents.push({ label: 'Filed', date: d.filingDate, color: 'bg-amber-500' });
  if (d.registrationDate) timelineEvents.push({ label: 'Registered', date: d.registrationDate, color: 'bg-blue-500' });
  if (d.firstHearingDate) timelineEvents.push({ label: 'First Hearing', date: d.firstHearingDate, color: 'bg-indigo-500' });
  if (d.nextHearingDate) timelineEvents.push({ label: 'Next Hearing', date: d.nextHearingDate, color: 'bg-orange-500' });
  if (d.decisionDate) timelineEvents.push({ label: 'Decision', date: d.decisionDate, color: 'bg-emerald-500' });

  return (
    <div className="flex bg-zinc-950 text-zinc-100 min-h-[calc(100vh-3.5rem)] animate-in slide-in-from-bottom-2 duration-500">
      <div className="flex-1 overflow-auto p-8 lg:p-12">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <header className="border-b border-zinc-800 pb-8 mb-8">
            <Link href="/ecourts" className="inline-flex items-center text-sm font-mono text-zinc-500 hover:text-amber-500 mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to eCourts Search
            </Link>

            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <Badge className="font-mono text-sm bg-zinc-900 border border-zinc-700 text-zinc-400">
                CNR: {cnr}
              </Badge>
              {d.caseNumber && (
                <Badge variant="outline" className="font-mono text-xs text-zinc-500 border-zinc-700">
                  {d.caseNumber}
                </Badge>
              )}
              <Badge className={`px-3 uppercase tracking-wider font-bold border ${statusColor}`}>
                {d.caseStatus}
              </Badge>
              <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-400 font-mono text-xs uppercase border border-indigo-500/20">
                ⚖️ eCourts
              </Badge>
              <Badge variant="outline" className="text-xs font-mono text-zinc-600 border-zinc-800">
                {d.caseType}
              </Badge>
            </div>

            <h1 className="text-3xl lg:text-4xl font-serif font-bold text-white tracking-wide mb-6">
              {title}
            </h1>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm text-zinc-400 font-mono bg-zinc-900/40 p-6 rounded-md border border-zinc-800">
              <div className="flex items-center gap-3">
                <Scale className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-zinc-600 uppercase text-xs">Court</p>
                  <p className="text-zinc-200">{d.courtName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Landmark className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-zinc-600 uppercase text-xs">Location</p>
                  <p className="text-zinc-200">{d.district}, {d.state}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-zinc-600 uppercase text-xs">Next Hearing</p>
                  <p className="text-amber-400 font-bold">{d.nextHearingDate || 'N/A'}</p>
                </div>
              </div>
            </div>

            {d.benchName && (
              <div className="mt-4 p-3 bg-zinc-900/30 border border-zinc-800 rounded-md">
                <span className="text-zinc-600 text-xs uppercase font-mono">Bench: </span>
                <span className="text-zinc-300 text-sm">{d.benchName}</span>
                {d.purpose && (
                  <span className="text-zinc-500 text-sm ml-4">| Purpose: <span className="text-zinc-300">{d.purpose}</span></span>
                )}
              </div>
            )}
          </header>

          {/* Tabs */}
          <Tabs defaultValue="overview" className="w-full flex-col">
            <TabsList className="bg-transparent border-b border-zinc-800 w-full justify-start rounded-none h-12 mb-8 p-0 gap-8 overflow-x-auto overflow-y-hidden">
              <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-amber-500 data-[state=active]:text-amber-500 rounded-none h-full text-zinc-400 text-sm font-semibold uppercase tracking-wider px-0 shrink-0">
                <Brain className="w-4 h-4 mr-2" /> Overview
              </TabsTrigger>
              <TabsTrigger value="parties" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-amber-500 data-[state=active]:text-amber-500 rounded-none h-full text-zinc-400 text-sm font-semibold uppercase tracking-wider px-0 shrink-0">
                <Users className="w-4 h-4 mr-2" /> Parties
              </TabsTrigger>
              <TabsTrigger value="timeline" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-amber-500 data-[state=active]:text-amber-500 rounded-none h-full text-zinc-400 text-sm font-semibold uppercase tracking-wider px-0 shrink-0">
                <Clock className="w-4 h-4 mr-2" /> Timeline
              </TabsTrigger>
              <TabsTrigger value="orders" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-amber-500 data-[state=active]:text-amber-500 rounded-none h-full text-zinc-400 text-sm font-semibold uppercase tracking-wider px-0 shrink-0">
                <FileText className="w-4 h-4 mr-2" /> Orders ({files.length})
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-8 animate-in fade-in duration-300">
              {ai ? (
                <>
                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader>
                      <CardTitle className="font-serif text-lg text-zinc-200 flex items-center gap-2">
                        <Brain className="w-5 h-5 text-amber-500" />
                        AI Case Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-zinc-300 leading-relaxed border-l-2 border-amber-500/50 pl-4 italic">
                        &quot;{ai.caseSummary}&quot;
                      </p>
                      <div className="flex gap-4 flex-wrap">
                        <div className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded">
                          <span className="text-zinc-600 text-xs uppercase">Type</span>
                          <p className="text-zinc-300 text-sm font-mono">{ai.caseType}</p>
                        </div>
                        <div className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded">
                          <span className="text-zinc-600 text-xs uppercase">Complexity</span>
                          <p className={`text-sm font-bold ${complexityColor(ai.complexity)}`}>{ai.complexity}</p>
                        </div>
                      </div>
                      {ai.keyIssues && ai.keyIssues.length > 0 && (
                        <div>
                          <p className="text-zinc-600 text-xs uppercase mb-2">Key Issues</p>
                          <div className="flex flex-wrap gap-2">
                            {ai.keyIssues.map((issue, i) => (
                              <Badge key={i} variant="outline" className="text-zinc-300 border-zinc-700">
                                {issue}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="text-center p-8 bg-zinc-900/30 border border-zinc-800 rounded-lg">
                  <Brain className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-500 font-mono text-sm">AI analysis not yet available for this case.</p>
                </div>
              )}

              {d.actsAndSections && (
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="font-serif text-lg text-zinc-200 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-amber-500" />
                      Acts & Sections
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-zinc-300 font-mono text-sm">{d.actsAndSections}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Parties Tab */}
            <TabsContent value="parties" className="space-y-8 animate-in fade-in duration-300">
              {/* Petitioners */}
              <section>
                <h3 className="text-lg font-serif font-bold text-zinc-300 mb-4 flex items-center gap-2">
                  <ChevronRight className="w-5 h-5 text-red-400" />
                  Petitioners ({d.petitioners?.length || 0})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {d.petitioners?.map((p, i) => (
                    <Card key={i} className="bg-zinc-900/50 border-zinc-800 border-l-2 border-l-red-500/50">
                      <CardContent className="p-4">
                        <p className="text-zinc-200 font-serif text-lg">{p}</p>
                        {d.petitionerAdvocates?.[i] && (
                          <p className="text-zinc-500 text-sm mt-1 font-mono">
                            Advocate: {d.petitionerAdvocates[i]}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>

              {/* Respondents */}
              <section>
                <h3 className="text-lg font-serif font-bold text-zinc-300 mb-4 flex items-center gap-2">
                  <ChevronRight className="w-5 h-5 text-blue-400" />
                  Respondents ({d.respondents?.length || 0})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {d.respondents?.map((r, i) => (
                    <Card key={i} className="bg-zinc-900/50 border-zinc-800 border-l-2 border-l-blue-500/50">
                      <CardContent className="p-4">
                        <p className="text-zinc-200 font-serif text-lg">{r}</p>
                        {d.respondentAdvocates?.[i] && (
                          <p className="text-zinc-500 text-sm mt-1 font-mono">
                            Advocate: {d.respondentAdvocates[i]}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>

              {/* Judges */}
              <section>
                <h3 className="text-lg font-serif font-bold text-zinc-300 mb-4 flex items-center gap-2">
                  <Gavel className="w-5 h-5 text-amber-500" />
                  Judges ({d.judges?.length || 0})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {d.judges?.map((j, i) => (
                    <Card key={i} className="bg-zinc-900/50 border-zinc-800 border-l-2 border-l-amber-500/50">
                      <CardContent className="p-4">
                        <p className="text-zinc-200 font-serif text-lg">{j}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="animate-in fade-in duration-300">
              <div className="relative pl-8 border-l-2 border-zinc-800 space-y-8">
                {timelineEvents.map((event, i) => (
                  <div key={i} className="relative">
                    <div className={`absolute -left-[25px] w-4 h-4 rounded-full ${event.color} border-2 border-zinc-950`} />
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`${event.color}/10 text-xs`}>{event.label}</Badge>
                        <span className="text-zinc-500 font-mono text-xs">{event.date}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {timelineEvents.length === 0 && (
                <div className="text-center p-8 bg-zinc-900/30 border border-zinc-800 rounded-lg">
                  <Clock className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-500 font-mono text-sm">No timeline events available.</p>
                </div>
              )}
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders" className="space-y-4 animate-in fade-in duration-300">
              {files.length > 0 ? (
                files.map((file, i) => (
                  <Card key={i} className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader>
                      <CardTitle className="font-serif text-lg text-zinc-200 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-amber-500" />
                        {file.pdfFile}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {file.aiAnalysis ? (
                        <>
                          <p className="text-zinc-300 leading-relaxed italic border-l-2 border-amber-500/50 pl-4">
                            &quot;{file.aiAnalysis.summary}&quot;
                          </p>
                          <div className="flex gap-3 flex-wrap">
                            <Badge variant="outline" className="text-zinc-300 border-zinc-700">
                              {file.aiAnalysis.orderType}
                            </Badge>
                            <Badge variant="outline" className={`border-zinc-700 ${
                              file.aiAnalysis.outcome === 'PETITIONER_FAVORED' ? 'text-red-400' : 
                              file.aiAnalysis.outcome === 'RESPONDENT_FAVORED' ? 'text-blue-400' : 'text-zinc-400'
                            }`}>
                              {file.aiAnalysis.outcome}
                            </Badge>
                          </div>
                          {file.aiAnalysis.keyPoints && (
                            <div>
                              <p className="text-zinc-600 text-xs uppercase mb-2">Key Points</p>
                              <ul className="space-y-1">
                                {file.aiAnalysis.keyPoints.map((kp, j) => (
                                  <li key={j} className="text-zinc-400 text-sm flex items-start gap-2">
                                    <span className="text-amber-500 mt-1">•</span> {kp}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-zinc-500 text-sm font-mono">AI analysis not available for this order.</p>
                      )}

                      {file.markdownContent && (
                        <details className="mt-4">
                          <summary className="text-amber-500 text-sm cursor-pointer hover:text-amber-400 font-mono">
                            View order text →
                          </summary>
                          <div className="mt-3 p-4 bg-zinc-950 border border-zinc-800 rounded text-sm text-zinc-400 font-mono whitespace-pre-wrap max-h-96 overflow-y-auto">
                            {file.markdownContent}
                          </div>
                        </details>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center p-8 bg-zinc-900/30 border border-zinc-800 rounded-lg">
                  <FileText className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-500 font-mono text-sm">No orders available for this case.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
