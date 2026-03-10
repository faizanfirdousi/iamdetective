import { use } from 'react';
import Link from 'next/link';
import { 
  FileText, Scale, MapPin, Search, Calendar, Shield, Users, Clock, AlertTriangle, ArrowLeft
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function CaseDossier({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  
  let dossier = null;
  let fetchError = false;

  try {
    const res = await fetch(`http://localhost:8080/api/v1/cases/${id}`, {
      cache: 'no-store'
    });
    if (!res.ok) {
        throw new Error('Case not found or failed to fetch');
    }
    const json = await res.json();
    dossier = json.data;
  } catch (error) {
    console.error("Error fetching case details:", error);
    fetchError = true;
  }

  if (fetchError || !dossier) {
      return (
        <div className="flex bg-zinc-950 text-zinc-100 min-h-[calc(100vh-3.5rem)] items-center justify-center">
            <div className="text-center space-y-4">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
                <h1 className="text-2xl font-serif text-white">Case Dossier Unavailable</h1>
                <p className="text-zinc-500">The requested case could not be retrieved from the database.</p>
                <Link href="/cases">
                    <Button variant="outline" className="mt-4 border-zinc-700 text-zinc-300 hover:text-amber-500">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Return to Database
                    </Button>
                </Link>
            </div>
        </div>
      )
  }

  // Safely map fields from the API schema to our display template
  const caseId = dossier.id || id;
  const title = dossier.title || dossier.case_name || 'Under Seal Document';
  const status = dossier.status && dossier.status !== 'unknown' ? dossier.status : 'UNKNOWN';
  const source = dossier.source || 'courtlistener';
  const court = dossier.jurisdiction || 'Unknown Jurisdiction';
  
  // Format the date string if it exists and isn't empty
  let filedDate = 'Unknown Date';
  if (dossier.filed_date) {
      const parsedDate = new Date(dossier.filed_date);
      if (!isNaN(parsedDate.getTime())) {
          filedDate = parsedDate.toLocaleDateString();
      }
  }

  const summary = dossier.summary || 'No suit summary provided natively by the source API.';
  const fullText = dossier.full_text || 'No full text body was retrieved for this case document.';
  const parties = dossier.parties && dossier.parties.length > 0 ? dossier.parties : ['Unknown First Party', 'Unknown Second Party'];
  const sourceURL = dossier.source_url || '';
  const caseType = dossier.case_type || 'Unknown';

  return (
    <div className="flex bg-zinc-950 text-zinc-100 min-h-[calc(100vh-3.5rem)] animate-in slide-in-from-bottom-2 duration-500">
      
      {/* Main Dossier Content */}
      <div className="flex-1 overflow-auto p-8 lg:p-12">
        <div className="max-w-5xl mx-auto">
          
          {/* Header */}
          <header className="border-b border-zinc-800 pb-8 mb-8">
            <Link href="/cases" className="inline-flex items-center text-sm font-mono text-zinc-500 hover:text-amber-500 mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Search Results
            </Link>

            <div className="flex items-center gap-3 mb-4">
              <Badge className="font-mono text-sm bg-zinc-900 border border-zinc-700 text-zinc-400">
                CASE ID: {caseId}
              </Badge>
              <Badge className={
                status === 'open' 
                  ? 'bg-red-500/10 text-red-500 border border-red-500/20 px-3 uppercase tracking-wider font-bold' 
                  : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 uppercase tracking-wider font-bold'
              }>
                {status}
              </Badge>
              <Badge variant="outline" className="text-zinc-400 border-zinc-700 flex items-center gap-1 uppercase">
                <Shield className="w-3 h-3" />
                {source}
              </Badge>
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-serif font-bold text-white tracking-wide mb-6">
              {title}
            </h1>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm text-zinc-400 font-mono bg-zinc-900/40 p-6 rounded-md border border-zinc-800">
              <div className="flex items-center gap-3">
                <Scale className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-zinc-600 uppercase text-xs">Jurisdiction</p>
                  <p className="text-zinc-200">{court}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-zinc-600 uppercase text-xs">Filed Date</p>
                  <p className="text-zinc-200">{filedDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-zinc-600 uppercase text-xs">Location</p>
                  <p className="text-zinc-200">United States</p>
                </div>
              </div>
            </div>
          </header>

          {/* Dossier Tabs */}
          <Tabs defaultValue="overview" className="w-full flex-col">
            <TabsList className="bg-transparent border-b border-zinc-800 w-full justify-start rounded-none h-12 mb-8 p-0 gap-8 overflow-x-auto overflow-y-hidden">
              <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-amber-500 data-[state=active]:text-amber-500 rounded-none h-full text-zinc-400 text-sm font-semibold uppercase tracking-wider px-0 shrink-0">
                <FileText className="w-4 h-4 mr-2" /> Overview
              </TabsTrigger>
              <TabsTrigger value="parties" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-amber-500 data-[state=active]:text-amber-500 rounded-none h-full text-zinc-400 text-sm font-semibold uppercase tracking-wider px-0 shrink-0">
                <Users className="w-4 h-4 mr-2" /> Parties
              </TabsTrigger>
              <TabsTrigger value="timeline" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-amber-500 data-[state=active]:text-amber-500 rounded-none h-full text-zinc-400 text-sm font-semibold uppercase tracking-wider px-0 shrink-0">
                <Clock className="w-4 h-4 mr-2" /> Timeline
              </TabsTrigger>
              <TabsTrigger value="evidence" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-amber-500 data-[state=active]:text-amber-500 rounded-none h-full text-zinc-400 text-sm font-semibold uppercase tracking-wider px-0 shrink-0">
                <AlertTriangle className="w-4 h-4 mr-2" /> Evidence Notes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-8 animate-in fade-in duration-300">
              <section>
                <h3 className="text-lg font-serif font-bold text-zinc-300 mb-4 flex items-center gap-2">
                  Case Nature Synopsis
                </h3>
                <p className="text-zinc-400 leading-relaxed text-lg border-l-2 border-amber-500/50 pl-6 py-2 bg-zinc-900/20 italic">
                  "{summary}"
                </p>
              </section>

              <section>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <h3 className="text-lg font-serif font-bold text-zinc-300">
                    Full Text Analysis
                  </h3>
                  <Sheet>
                    <SheetTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-amber-500/50 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400 bg-transparent h-9 px-4 py-2">
                        <Search className="w-4 h-4 mr-2" />
                        Analyze Selected Text
                    </SheetTrigger>
                    <SheetContent className="bg-zinc-950 border-l border-zinc-800 text-zinc-100 sm:max-w-md w-full p-0">
                      <SheetHeader className="p-6 border-b border-zinc-800 bg-zinc-900/50">
                        <SheetTitle className="text-white flex items-center gap-2 font-serif text-xl tracking-wide">
                          <Search className="text-amber-500 w-5 h-5" />
                          Detective Analysis
                        </SheetTitle>
                      </SheetHeader>
                      <div className="p-6 space-y-6">
                        <p className="text-sm text-zinc-400 font-mono">
                          Highlight text in the dossier and click here to search Wikipedia, cross-reference the FBI database, or find related historical cases.
                        </p>
                        <Card className="bg-zinc-900 border-zinc-800">
                          <CardContent className="p-4 text-sm text-zinc-300 italic">
                            Awaiting text selection...
                          </CardContent>
                        </Card>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
                
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6 lg:p-8 font-serif text-lg leading-loose text-zinc-400 whitespace-pre-wrap selection:bg-amber-500/30 selection:text-amber-200 shadow-inner h-[600px] overflow-y-auto">
                  {fullText}
                </div>
              </section>
            </TabsContent>

            <TabsContent value="parties" className="animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {parties.map((p: string, i: number) => (
                  <Card key={i} className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader>
                      <CardTitle className="font-serif text-xl text-zinc-200 capitalize">{p}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Linking back to search by party name */}
                      <Link href={`/cases?q=${encodeURIComponent(p)}`}>
                        <Button variant="link" className="text-amber-500 p-0 h-auto font-mono text-sm">
                          Find Related Cases →
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="timeline" className="animate-in fade-in duration-300">
                 <div className="space-y-6">
                    <div className="relative pl-8 border-l-2 border-zinc-800 space-y-8">
                      {/* Filing Event */}
                      <div className="relative">
                        <div className="absolute -left-[25px] w-4 h-4 rounded-full bg-amber-500 border-2 border-zinc-950" />
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-amber-500/10 text-amber-500 text-xs">FILING</Badge>
                            <span className="text-zinc-500 font-mono text-xs">{filedDate}</span>
                          </div>
                          <p className="text-zinc-300 text-sm">Case filed: <strong className="text-white">{title}</strong></p>
                          <p className="text-zinc-500 text-xs mt-1">Jurisdiction: {court}</p>
                        </div>
                      </div>

                      {/* Status Event */}
                      <div className="relative">
                        <div className={`absolute -left-[25px] w-4 h-4 rounded-full border-2 border-zinc-950 ${status === 'open' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={status === 'open' ? 'bg-red-500/10 text-red-500 text-xs' : 'bg-emerald-500/10 text-emerald-500 text-xs'}>STATUS</Badge>
                          </div>
                          <p className="text-zinc-300 text-sm">Case status: <strong className="text-white uppercase">{status}</strong></p>
                        </div>
                      </div>
                    </div>

                    <div className="text-center p-6 bg-zinc-900/20 border border-zinc-800/50 rounded-lg mt-6">
                      <p className="text-zinc-600 font-mono text-xs">Additional timeline events will populate as case data is enriched from CourtListener docket records.</p>
                    </div>
                 </div>
            </TabsContent>
            
            <TabsContent value="evidence" className="animate-in fade-in duration-300">
                 <div className="space-y-4">
                    {sourceURL ? (
                      <Card className="bg-zinc-900/50 border-zinc-800">
                        <CardHeader>
                          <CardTitle className="font-serif text-lg text-zinc-200 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-amber-500" />
                            Original Court Filing
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-zinc-400 text-sm">Source document from {source.toUpperCase()}</p>
                          <a 
                            href={sourceURL} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-2 text-amber-500 hover:text-amber-400 font-mono text-sm underline underline-offset-4"
                          >
                            View on CourtListener →
                          </a>
                          <div className="mt-3 p-3 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-500 font-mono break-all">
                            {sourceURL}
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="text-center p-12 bg-zinc-900/30 border border-zinc-800 rounded-lg">
                        <AlertTriangle className="w-8 h-8 text-zinc-600 mx-auto mb-4" />
                        <p className="text-zinc-500 font-mono">No source documents linked to this record.</p>
                      </div>
                    )}

                    <div className="p-4 bg-zinc-900/20 border border-zinc-800/50 rounded-lg">
                      <p className="text-zinc-600 font-mono text-xs">Additional court documents, PDFs, and evidence exhibits will be linked here as they become available from the data ingestion pipeline.</p>
                    </div>
                 </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
