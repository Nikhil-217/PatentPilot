"use client";

import { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';

interface PageProps {
  params: Promise<{ id: string }>;
}

function AnalysisDashboardPageInner({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  
  // Dashboard state
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'submission' | 'patents' | 'ai' | 'report'>('patents');
  const [selectedMatch, setSelectedMatch] = useState<any>(null);

  // Sync active tab state from URL query parameter
  useEffect(() => {
    if (tabParam === 'ai') {
      setActiveTab('ai');
    } else if (tabParam === 'report') {
      setActiveTab('report');
    } else if (tabParam === 'submission') {
      setActiveTab('submission');
    } else {
      setActiveTab('patents');
    }
  }, [tabParam]);

  // Sync current analysis ID to localStorage on page load
  useEffect(() => {
    if (typeof window !== 'undefined' && id) {
      localStorage.setItem('lastAnalysisId', id);
    }
  }, [id]);

  // Tab 1 (Submission/Re-submit) form states
  const [formCommonName, setFormCommonName] = useState('');
  const [formOrigin, setFormOrigin] = useState('Select Species...');
  const [formSmiles, setFormSmiles] = useState('');
  const [formTarget, setFormTarget] = useState('');
  const [formIndication, setFormIndication] = useState('');
  const [submittingQuery, setSubmittingQuery] = useState(false);
  const [renderSvg, setRenderSvg] = useState<string | null>(null);
  const [renderError, setRenderError] = useState(false);

  // Tab 2 (Reports / Review) workspace states
  const [reviewFlagged, setReviewFlagged] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  // Fetch analysis data and poll if processing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const fetchAnalysis = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/analyses/${id}`);
        if (!res.ok) throw new Error('Failed to fetch analysis');
        const data = await res.json();
        setAnalysis(data);
        
        const isPending = ['pending', 'retrieving', 'scoring'].includes(data.status);
        if (!isPending) {
          setLoading(false);
          clearInterval(interval);
          
          // Set initial form states for re-submission
          if (data.smiles_input && !formSmiles) {
            setFormSmiles(data.smiles_input);
            setFormTarget(data.target || '');
            setFormIndication(data.indication || '');
          }

          // Set default selected match for Review & AI tabs
          if (data.patent_matches && data.patent_matches.length > 0) {
            setSelectedMatch((prev: any) => {
              if (prev) {
                const updated = data.patent_matches.find((m: any) => m.patent_id === prev.patent_id);
                return updated || data.patent_matches[0];
              }
              return data.patent_matches[0];
            });
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchAnalysis();
    interval = setInterval(fetchAnalysis, 3000);
    return () => clearInterval(interval);
  }, [id]);

  // Debounced 2D molecular drawing for Tab 1 (Submission)
  useEffect(() => {
    if (!formSmiles.trim()) {
      setRenderSvg(null);
      setRenderError(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/analyses/render?smiles=${encodeURIComponent(formSmiles.trim())}`);
        if (!res.ok) throw new Error('Invalid structure');
        const svg = await res.text();
        setRenderSvg(svg);
        setRenderError(false);
      } catch {
        setRenderSvg(null);
        setRenderError(true);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formSmiles]);

  // Sync Tab 2 input fields when the selected patent changes
  useEffect(() => {
    if (selectedMatch) {
      setReviewFlagged(!!selectedMatch.flagged_for_manual_review);
      setReviewNote(selectedMatch.researcher_note || '');
    }
  }, [selectedMatch]);

  // PATCH reviewer notes and flags (Tab 2)
  const handleSaveReview = async () => {
    if (!selectedMatch) return;
    setSavingReview(true);
    try {
      const res = await fetch(`http://localhost:8000/api/analyses/${id}/patents/${selectedMatch.patent_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flagged_for_manual_review: reviewFlagged,
          researcher_note: reviewNote
        })
      });
      if (!res.ok) throw new Error('Failed to patch notes');
      const updated = await res.json();
      setAnalysis(updated);
      
      // Update local selected match reference
      const updatedMatch = updated.patent_matches.find((m: any) => m.patent_id === selectedMatch.patent_id);
      if (updatedMatch) setSelectedMatch(updatedMatch);
      alert('Review flags and notes saved!');
    } catch (e) {
      console.error(e);
      alert('Failed to save review comments.');
    } finally {
      setSavingReview(false);
    }
  };

  // POST query re-submission (Tab 1)
  const handleReSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSmiles.trim()) return;
    setSubmittingQuery(true);
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smiles: formSmiles,
          target: formTarget,
          indication: formIndication
        })
      });
      if (!res.ok) throw new Error('Submission failed');
      const data = await res.json();
      
      // Reset state and redirect
      setAnalysis(null);
      setFormSmiles('');
      setRenderSvg(null);
      setSelectedMatch(null);
      setActiveTab('patents');
      router.push(`/analysis/${data.analysis_id}`);
    } catch (err) {
      console.error(err);
      alert('Resubmission failed');
      setLoading(false);
    } finally {
      setSubmittingQuery(false);
    }
  };

  // Generate Report and route to Tab 4
  const handleGenerateReport = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/analyses/${id}/report`, { method: 'POST' });
      if (res.ok) {
        // Fetch updated analysis to include report fields
        const updateRes = await fetch(`http://localhost:8000/api/analyses/${id}`);
        if (updateRes.ok) {
          const updated = await updateRes.json();
          setAnalysis(updated);
        }
        setActiveTab('report');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadPDF = () => {
    window.open(`http://localhost:8000/api/analyses/${id}/report/download`, '_blank');
  };

  if (!analysis) return (
    <div className="min-h-screen bg-background text-on-surface flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-sm font-bold text-primary">Loading dashboard session...</p>
      </div>
    </div>
  );

  const isProcessing = ['pending', 'retrieving', 'scoring'].includes(analysis.status);

  // Helper to parse the structured AI response sections
  const formatAIExplanation = (exp: string) => {
    if (!exp) return <p className="text-xs text-on-surface-variant leading-relaxed">No AI analysis available.</p>;
    
    // Check for "1. Why retrieved" structure
    if (exp.includes("1. ") || exp.includes("Why retrieved") || exp.includes("Similar aspects")) {
      const segments = exp.split(/(?=\b\d\.\s|Why retrieved|Similar aspects|Potential overlap|Confidence)/gi);
      return (
        <div className="space-y-4">
          {segments.map((seg, idx) => {
            const trimmed = seg.trim();
            if (!trimmed) return null;
            let header = "Details";
            let body = trimmed;
            
            const matchHeader = trimmed.match(/^(\d\.\s+)?([^:]+):/i);
            if (matchHeader) {
              header = matchHeader[2].replace(/^(Why |Which |What |How )/gi, '').trim();
              body = trimmed.slice(matchHeader[0].length).trim();
            }
            
            return (
              <div key={idx} className="border-l-2 border-primary/30 pl-3.5 py-0.5">
                <h5 className="text-[11px] font-bold text-primary capitalize mb-1">{header}</h5>
                <p className="text-xs text-on-surface-variant leading-relaxed">{body}</p>
              </div>
            );
          })}
        </div>
      );
    }
    return <p className="text-xs text-on-surface-variant leading-relaxed">{exp}</p>;
  };

  const getRecommendationStyles = (tier: string) => {
    switch (tier) {
      case 'high_risk':
        return { label: 'High Patent Risk', bg: 'bg-error-container', text: 'text-on-error-container', border: 'border-error/30', colorHex: '#ba1a1a' };
      case 'requires_review':
        return { label: 'Requires Expert Review', bg: 'bg-secondary-container', text: 'text-on-secondary-container', border: 'border-secondary/30', colorHex: '#745a39' };
      default:
        return { label: 'Low Patent Risk', bg: 'bg-primary-fixed', text: 'text-on-primary-fixed-variant', border: 'border-primary/30', colorHex: '#23472b' };
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-background flex flex-col overflow-x-hidden w-full">
      <Header />

      {/* Main Panel Body */}
      <div className="flex-1 w-full max-w-container-max mx-auto p-margin-mobile md:p-gutter flex flex-col">
        {isProcessing ? (
          <div className="bg-white border border-outline-variant rounded-xl p-16 text-center shadow-[0_4px_12px_rgba(35,71,43,0.04)] flex-grow flex flex-col justify-center items-center">
            <div className="w-16 h-16 rounded-full bg-primary-container/20 flex items-center justify-center text-primary mb-6 animate-spin">
              <span className="material-symbols-outlined text-4xl">autorenew</span>
            </div>
            <h3 className="font-headline-lg text-headline-lg text-primary font-bold mb-2">Analysis in Progress</h3>
            <p className="mb-6 text-on-surface-variant max-w-md">Our deep learning pipelines are querying chemical data catalogs and scoring patents. Current status: <span className="font-bold text-primary capitalize">{analysis.status}</span>.</p>
            <div className="w-full max-w-md bg-surface-container h-2 rounded-full overflow-hidden">
              <div className="bg-primary h-full rounded-full w-2/3 animate-pulse"></div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            
            {/* VIEW 1: Platform / Submission */}
            {activeTab === 'submission' && (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                <div className="xl:col-span-7 space-y-8">
                  <div className="bg-white border border-outline-variant rounded-xl p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined">edit_note</span>
                      </div>
                      <h3 className="font-headline-md text-headline-md text-primary font-bold">Resubmit Compound</h3>
                    </div>
                    <form onSubmit={handleReSubmit} className="space-y-6">
                      <div className="space-y-2">
                        <label className="block font-label-md text-label-md text-on-surface font-bold ml-1">
                          SMILES Notation <span className="text-error">*</span>
                        </label>
                        <textarea 
                          value={formSmiles}
                          onChange={e => setFormSmiles(e.target.value)}
                          required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-3 px-4 font-mono text-body-sm transition-all outline-none resize-none" 
                          placeholder="CC(=O)OC1=CC=CC=C1C(=O)O" 
                          rows={4}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block font-label-md text-label-md text-on-surface-variant ml-1">
                            Biological Target <span className="text-on-surface-variant/70">(Optional)</span>
                          </label>
                          <input 
                            type="text"
                            value={formTarget}
                            onChange={e => setFormTarget(e.target.value)}
                            className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-3 px-4 font-body-md transition-all outline-none" 
                            placeholder="e.g. COX-2 Enzyme"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block font-label-md text-label-md text-on-surface-variant ml-1">
                            Therapeutic Indication <span className="text-on-surface-variant/70">(Optional)</span>
                          </label>
                          <input 
                            type="text"
                            value={formIndication}
                            onChange={e => setFormIndication(e.target.value)}
                            className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-3 px-4 font-body-md transition-all outline-none" 
                            placeholder="e.g. Inflammation"
                          />
                        </div>
                      </div>
                      <div className="pt-4">
                        <button 
                          type="submit"
                          disabled={submittingQuery || !formSmiles.trim()}
                          className="w-full bg-primary text-on-primary py-4 px-8 rounded-lg font-headline-md text-headline-md shadow-lg shadow-primary/20 flex items-center justify-center gap-3 hover:opacity-90 active:scale-95 duration-100 disabled:opacity-50"
                        >
                          {submittingQuery ? 'Launching FTO pipeline...' : 'Submit & Analyze'}
                          <span className="material-symbols-outlined">auto_awesome</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                <div className="xl:col-span-5">
                  <div className="bg-white border border-outline-variant rounded-xl p-6 md:p-8 flex flex-col h-[400px] relative overflow-hidden group">
                    <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
                      <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                        <pattern id="grid-tab" width="10" height="10" patternUnits="userSpaceOnUse">
                          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5"></path>
                        </pattern>
                        <rect width="100%" height="100%" fill="url(#grid-tab)"></rect>
                      </svg>
                    </div>
                    <div className="mb-4">
                      <h3 className="font-headline-md text-headline-md text-primary font-bold">2D Structure Render</h3>
                      <p className="text-xs text-on-surface-variant">Real-time structure validation</p>
                    </div>
                    <div className="flex-1 rounded-xl bg-surface-container-lowest border border-dashed border-outline-variant flex items-center justify-center overflow-hidden p-4">
                      {renderSvg ? (
                        <div 
                          className="w-full h-full flex items-center justify-center svg-container [&>svg]:max-w-full [&>svg]:max-h-full" 
                          dangerouslySetInnerHTML={{ __html: renderSvg }} 
                        />
                      ) : renderError ? (
                        <div className="text-center">
                          <span className="material-symbols-outlined text-error text-3xl mb-1">error</span>
                          <p className="text-xs font-bold text-error">Invalid SMILES Notation</p>
                        </div>
                      ) : (
                        <div className="text-center text-on-surface-variant">
                          <span className="material-symbols-outlined text-3xl text-outline-variant mb-2">draw</span>
                          <p className="text-xs font-bold">Chemical Structure Preview</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 2: Patent Reports (Extracted Data) */}
            {activeTab === 'patents' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start flex-grow">
                {/* Left side list of patents */}
                <div className="lg:col-span-7 bg-white rounded-xl border border-outline-variant overflow-hidden shadow-sm flex flex-col">
                  <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/30">
                    <div>
                      <h4 className="font-headline-md text-primary font-bold">Extracted Patent Records</h4>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">Core targets matching subject query {analysis.smiles_input.slice(0, 30)}...</p>
                    </div>
                    <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-full">{analysis.patent_matches?.length || 0} Records</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-surface-container-low/30 border-b border-outline-variant text-[11px] uppercase tracking-wider text-on-surface-variant">
                          <th className="px-6 py-3.5 font-bold">Patent ID</th>
                          <th className="px-6 py-3.5 font-bold">Title / Assignee</th>
                          <th className="px-6 py-3.5 font-bold">Relevance</th>
                          <th className="px-6 py-3.5 font-bold">Assessment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/30 text-xs">
                        {analysis.patent_matches?.map((match: any) => {
                          const isSelected = selectedMatch && selectedMatch.patent_id === match.patent_id;
                          const riskStyles = getRecommendationStyles(match.risk_tier);
                          
                          return (
                            <tr 
                              key={match.patent_id}
                              onClick={() => setSelectedMatch(match)}
                              className={`hover:bg-surface-container-low/40 transition-colors cursor-pointer ${isSelected ? 'bg-primary-container/10 border-l-4 border-primary' : ''}`}
                            >
                              <td className="px-6 py-4 font-bold text-primary">{match.patent_number}</td>
                              <td className="px-6 py-4 max-w-[220px] truncate">
                                <div className="flex flex-col">
                                  <span className="font-bold text-xs truncate">{match.title || 'Extracted Document'}</span>
                                  <span className="text-[10px] text-on-surface-variant font-medium truncate mt-0.5">{match.assignee || 'Unknown'}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-16 bg-surface-variant rounded-full overflow-hidden">
                                    <div className="h-full bg-primary" style={{ width: `${match.composite_risk_score}%` }}></div>
                                  </div>
                                  <span className="font-bold">{match.composite_risk_score}%</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-1">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${riskStyles.bg} ${riskStyles.text}`}>
                                    {match.risk_tier.replace('_', ' ')}
                                  </span>
                                  {match.flagged_for_manual_review && (
                                    <span className="material-symbols-outlined text-secondary text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>flag</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right side review workspace */}
                <div className="lg:col-span-5">
                  {selectedMatch ? (
                    <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm space-y-6">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] bg-surface-container text-on-surface-variant font-mono px-2 py-0.5 rounded uppercase font-bold">{selectedMatch.source}</span>
                          <span className="text-xs text-primary font-bold">Composite Score: {selectedMatch.composite_risk_score}%</span>
                        </div>
                        <h3 className="text-base font-bold text-primary leading-tight">{selectedMatch.title}</h3>
                        <p className="text-xs text-on-surface-variant font-mono mt-1">{selectedMatch.patent_number}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 py-3 border-y border-outline-variant/30 text-xs">
                        <div>
                          <span className="text-[10px] text-on-surface-variant uppercase font-bold">Assignee</span>
                          <p className="font-bold truncate">{selectedMatch.assignee}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-on-surface-variant uppercase font-bold">Publication Date</span>
                          <p className="font-bold">
                            {selectedMatch.publication_date ? new Date(selectedMatch.publication_date).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs text-primary font-bold mb-1.5">Abstract</h4>
                        <p className="text-xs text-on-surface-variant leading-relaxed p-3 bg-surface rounded-lg max-h-32 overflow-y-auto custom-scrollbar">
                          {selectedMatch.abstract}
                        </p>
                      </div>

                      <div className="border-t border-outline-variant/30 pt-4 space-y-4">
                        <h4 className="text-xs text-secondary font-bold uppercase tracking-wider">Reviewer Workspace</h4>
                        <label className="flex items-center gap-3 p-3 bg-surface-container-low rounded-lg border border-transparent hover:border-secondary/20 cursor-pointer transition-all">
                          <input 
                            type="checkbox"
                            checked={reviewFlagged}
                            onChange={e => setReviewFlagged(e.target.checked)}
                            className="rounded text-secondary focus:ring-secondary h-4 w-4"
                          />
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-on-surface">Flag for Manual Review</span>
                            <span className="text-[10px] text-on-surface-variant">Check to include this document in the priority review section.</span>
                          </div>
                        </label>
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-on-surface-variant">Researcher Notes</label>
                          <textarea 
                            value={reviewNote}
                            onChange={e => setReviewNote(e.target.value)}
                            className="w-full bg-surface border border-outline-variant focus:border-secondary focus:ring-2 focus:ring-secondary/20 rounded-lg p-3 text-xs outline-none resize-none" 
                            placeholder="Document claims, target alignments, or scientific overlap comments..." 
                            rows={3}
                          />
                        </div>
                        <button 
                          onClick={handleSaveReview}
                          disabled={savingReview}
                          className="w-full bg-secondary text-on-secondary py-2.5 rounded-lg font-bold text-xs hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-sm">save</span>
                          {savingReview ? 'Saving notes...' : 'Save Review Notes'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-outline-variant rounded-xl p-8 text-center text-on-surface-variant h-64 flex flex-col justify-center items-center">
                      <span className="material-symbols-outlined text-3xl text-outline-variant mb-2">workspace_premium</span>
                      <p className="text-xs font-bold">Select a patent record to inspect</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW 3: AI Analysis */}
            {activeTab === 'ai' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start flex-grow">
                {/* Selector column */}
                <div className="lg:col-span-4 bg-white rounded-xl border border-outline-variant p-4 space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
                  <h4 className="font-label-md text-primary font-bold px-2 py-1 border-b border-outline-variant/30 mb-3 text-xs uppercase">Matched Documents</h4>
                  {analysis.patent_matches?.map((match: any) => {
                    const isSelected = selectedMatch && selectedMatch.patent_id === match.patent_id;
                    const riskStyles = getRecommendationStyles(match.risk_tier);
                    
                    return (
                      <div 
                        key={match.patent_id}
                        onClick={() => setSelectedMatch(match)}
                        className={`p-3.5 rounded-lg border border-outline-variant/40 hover:border-primary/50 cursor-pointer transition-all ${
                          isSelected ? 'bg-primary-container/10 border-primary' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1 text-[10px]">
                          <span className="font-mono font-bold text-primary">{match.patent_number}</span>
                          <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[8px] ${riskStyles.bg} ${riskStyles.text}`}>{match.risk_tier}</span>
                        </div>
                        <p className="text-xs font-bold text-on-surface truncate">{match.title}</p>
                        <p className="text-[10px] text-on-surface-variant truncate mt-0.5">{match.assignee}</p>
                      </div>
                    );
                  })}
                </div>

                {/* AI Detail Panel */}
                <div className="lg:col-span-8 bg-white border border-outline-variant rounded-xl p-6 md:p-8 shadow-sm space-y-6">
                  {selectedMatch ? (
                    <>
                      <div className="flex justify-between items-start border-b border-outline-variant/30 pb-4">
                        <div>
                          <h3 className="font-headline-md text-headline-md text-primary font-bold">{selectedMatch.title}</h3>
                          <p className="text-xs text-on-surface-variant font-mono mt-1">ID: {selectedMatch.patent_number} | Assignee: {selectedMatch.assignee}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold block">Composite Risk</span>
                          <span className="text-2xl font-black text-primary">{selectedMatch.composite_risk_score}%</span>
                        </div>
                      </div>

                      {/* Score breakdown metrics */}
                      <div>
                        <h4 className="text-xs font-bold text-primary mb-3 uppercase tracking-wide">Scoring Vector Contribution</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="p-3.5 bg-surface-container rounded-lg border border-outline-variant/35">
                            <span className="text-[10px] text-on-surface-variant font-bold uppercase block">Tanimoto Structural Similarity</span>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="h-2 w-full bg-surface-variant rounded-full overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: `${(selectedMatch.structural_score / 50) * 100}%` }}></div>
                              </div>
                              <span className="text-xs font-bold text-primary font-mono">{selectedMatch.structural_score}/50</span>
                            </div>
                          </div>
                          
                          <div className="p-3.5 bg-surface-container rounded-lg border border-outline-variant/35">
                            <span className="text-[10px] text-on-surface-variant font-bold uppercase block">Cosine Semantic Similarity</span>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="h-2 w-full bg-surface-variant rounded-full overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: `${(selectedMatch.semantic_score / 30) * 100}%` }}></div>
                              </div>
                              <span className="text-xs font-bold text-primary font-mono">{selectedMatch.semantic_score}/30</span>
                            </div>
                          </div>
                          
                          <div className="p-3.5 bg-surface-container rounded-lg border border-outline-variant/35">
                            <span className="text-[10px] text-on-surface-variant font-bold uppercase block">Metadata Weight Contribution</span>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="h-2 w-full bg-surface-variant rounded-full overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: `${(selectedMatch.metadata_score / 20) * 100}%` }}></div>
                              </div>
                              <span className="text-xs font-bold text-primary font-mono">{selectedMatch.metadata_score}/20</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* AI explanation answers */}
                      <div className="border-t border-outline-variant/30 pt-6">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                          <h4 className="font-label-md text-label-md text-primary font-bold uppercase tracking-wide">AI explanation details</h4>
                        </div>
                        <div className="bg-primary-container/5 rounded-lg p-5 border border-primary-container/10">
                          {formatAIExplanation(selectedMatch.ai_explanation)}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="p-12 text-center text-on-surface-variant flex flex-col justify-center items-center h-full">
                      <span className="material-symbols-outlined text-4xl mb-2 text-outline-variant">psychology</span>
                      <p className="text-xs font-bold">Select a document from the left list to review detailed AI overlapping reports.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW 4: Patent Executability Report */}
            {activeTab === 'report' && (
              <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden w-full relative">
                {/* Actions row in Report body */}
                <div className="p-6 bg-surface-container-low border-b border-outline-variant/40 flex justify-between items-center px-12">
                  <h4 className="font-bold text-primary text-xs uppercase tracking-wider">Report Verification Sandbox</h4>
                  <button 
                    onClick={handleDownloadPDF}
                    className="bg-primary text-on-primary font-bold text-xs px-5 py-2.5 rounded-lg hover:opacity-90 flex items-center gap-2 shadow-sm transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">download</span>
                    Download PDF Report
                  </button>
                </div>

                {analysis.report ? (
                  <>
                    {/* Report Content */}
                    <div className="p-12 border-b border-outline-variant/40">
                      <div className="flex justify-between items-start mb-8">
                        <div className="w-16 h-16 border-2 border-primary rounded-xl flex items-center justify-center p-3 text-primary">
                          <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
                        </div>
                        <div className="text-right text-xs">
                          <p className="text-primary font-bold uppercase tracking-wider">FTO Clearance Status: Verified</p>
                          <p className="text-on-surface-variant mt-1">Generated: {new Date(analysis.report.generated_at).toLocaleDateString()}</p>
                          <p className="text-on-surface-variant font-mono">ID: PP-RE-{id.slice(-6).toUpperCase()}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div>
                          <h4 className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider mb-2">Subject Molecule</h4>
                          <p className="text-lg font-bold text-primary truncate max-w-sm">{analysis.smiles_input}</p>
                          <p className="text-xs text-on-surface-variant mt-2">
                            InChIKey: <span className="font-mono">{analysis.inchikey}</span>
                          </p>
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            Target: <span className="font-bold">{analysis.target}</span>
                          </p>
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            Indication: <span className="font-bold">{analysis.indication}</span>
                          </p>
                        </div>
                        
                        <div className="flex flex-col items-center md:items-end">
                          <h4 className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider mb-4">Novelty Conflictor Index</h4>
                          <div className="relative w-24 h-24 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle className="text-surface-container-high" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" strokeWidth="5"></circle>
                              <circle className="text-primary" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" strokeDasharray="251.3" strokeDashoffset={251.3 - (251.3 * (analysis.report.key_similar_patents?.[0]?.composite_risk_score || 0.0) / 100)} strokeWidth="5"></circle>
                            </svg>
                            <span className="absolute text-base font-bold text-primary">{analysis.report.key_similar_patents?.[0]?.composite_risk_score || 0.0}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-12 space-y-12 text-sm text-on-surface">
                      {/* Overall Recommendation Banner */}
                      {(() => {
                        const recStyles = getRecommendationStyles(analysis.report.overall_recommendation);
                        return (
                          <div className={`p-4 rounded-lg border ${recStyles.border} ${recStyles.bg} ${recStyles.text} flex items-center gap-3.5`}>
                            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                            <div>
                              <h4 className="font-bold text-xs">Overall FTO Rationale</h4>
                              <p className="text-[11px] font-bold uppercase mt-0.5">Recommendation: {recStyles.label}</p>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Executive Summary */}
                      <section>
                        <div className="flex items-center gap-3 mb-3">
                          <span className="w-2 h-5 bg-primary rounded-full"></span>
                          <h3 className="text-sm font-bold text-primary uppercase tracking-wider">1.0 Executive Summary</h3>
                        </div>
                        <p className="text-on-surface-variant text-xs leading-relaxed">
                          {analysis.report.executive_summary}
                        </p>
                      </section>

                      {/* Key Similar Patents Table */}
                      <section>
                        <div className="flex items-center gap-3 mb-4">
                          <span className="w-2 h-5 bg-primary rounded-full"></span>
                          <h3 className="text-sm font-bold text-primary uppercase tracking-wider">2.0 Key Similar Patents</h3>
                        </div>
                        {analysis.report.key_similar_patents && analysis.report.key_similar_patents.length > 0 ? (
                          <div className="border border-outline-variant rounded-lg overflow-hidden shadow-sm">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-surface-container-low border-b border-outline-variant text-[10px] uppercase font-bold text-primary">
                                  <th className="px-5 py-2.5">Patent Number</th>
                                  <th className="px-5 py-2.5">Patent Title</th>
                                  <th className="px-5 py-2.5 text-right">Composite Score</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-outline-variant/30 text-xs text-on-surface-variant font-medium">
                                {analysis.report.key_similar_patents.map((p: any) => (
                                  <tr key={p.patent_id} className="hover:bg-surface-container-low/40">
                                    <td className="px-5 py-3 font-bold text-primary">{p.patent_number}</td>
                                    <td className="px-5 py-3 truncate max-w-[250px]">{p.title || 'Extracted Document'}</td>
                                    <td className="px-5 py-3 font-bold text-right text-primary">{p.composite_risk_score}%</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-xs text-on-surface-variant italic">No similar patents found.</p>
                        )}
                      </section>

                      {/* Potential Novelty Concerns */}
                      <section>
                        <div className="flex items-center gap-3 mb-3">
                          <span className="w-2 h-5 bg-primary rounded-full"></span>
                          <h3 className="text-sm font-bold text-primary uppercase tracking-wider">3.0 Potential Novelty Concerns</h3>
                        </div>
                        <p className="text-on-surface-variant text-xs leading-relaxed">
                          {analysis.report.novelty_concerns}
                        </p>
                      </section>

                      {/* Manual Reviews Table */}
                      <section>
                        <div className="flex items-center gap-3 mb-4">
                          <span className="w-2 h-5 bg-primary rounded-full"></span>
                          <h3 className="text-sm font-bold text-primary uppercase tracking-wider">4.0 Patents Flagged for Expert Action</h3>
                        </div>
                        {analysis.report.manual_review_patents && analysis.report.manual_review_patents.length > 0 ? (
                          <div className="border border-outline-variant rounded-lg overflow-hidden shadow-sm">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-surface-container-low border-b border-outline-variant text-[10px] uppercase font-bold text-primary">
                                  <th className="px-5 py-2.5">Patent Number</th>
                                  <th className="px-5 py-2.5">Flag Reason</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-outline-variant/30 text-xs text-on-surface-variant font-medium">
                                {analysis.report.manual_review_patents.map((p: any) => (
                                  <tr key={p.patent_id} className="hover:bg-surface-container-low/40">
                                    <td className="px-5 py-3 font-bold text-primary">{p.patent_number}</td>
                                    <td className="px-5 py-3 leading-relaxed">{p.reason}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-xs text-on-surface-variant italic">No patents currently flagged for manual review.</p>
                        )}
                      </section>

                      {/* Methodology notes */}
                      <section>
                        <div className="flex items-center gap-3 mb-3">
                          <span className="w-2 h-5 bg-primary rounded-full"></span>
                          <h3 className="text-sm font-bold text-primary uppercase tracking-wider">5.0 Methodology Notes & Risk Rationale</h3>
                        </div>
                        <p className="text-on-surface-variant text-xs leading-relaxed">
                          {analysis.report.methodology_notes}
                        </p>
                        <p className="text-[10px] font-bold text-primary mt-3">SYSTEM CONFIDENCE RATING: {analysis.report.confidence_level * 100}%</p>
                      </section>
                    </div>

                    {/* Report Footer */}
                    <div className="bg-surface-container border-t border-outline-variant/30 p-6 flex justify-between items-center px-12 text-xs">
                      <div>
                        <p className="font-bold text-primary">Digitally verified by PatentPilot AI Framework</p>
                        <p className="text-[10px] text-on-surface-variant mt-0.5 font-mono">Certification Auth-Code: PP-CERT-{id.slice(-6).toUpperCase()}</p>
                      </div>
                      <span className="font-bold text-primary uppercase">Centella AI Therapeutics</span>
                    </div>
                  </>
                ) : (
                  <div className="p-16 text-center text-on-surface-variant flex flex-col justify-center items-center">
                    <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">description</span>
                    <p className="text-sm font-bold">No Report Generated Yet</p>
                    <p className="text-xs mt-1 mb-6">Review the Matched Patents and Notes, then compile the final executability summary.</p>
                    <button 
                      onClick={handleGenerateReport}
                      className="bg-primary text-on-primary font-bold text-xs px-6 py-3 rounded-lg hover:opacity-90 flex items-center gap-2 active:scale-95 transition-all shadow"
                    >
                      <span className="material-symbols-outlined text-sm">auto_awesome</span>
                      Generate Executability Report
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

import { Suspense } from 'react';

export default function AnalysisDashboardPage(props: PageProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm font-bold text-primary">Loading dashboard session...</p>
        </div>
      </div>
    }>
      <AnalysisDashboardPageInner {...props} />
    </Suspense>
  );
}
