"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

export default function NewAnalysisPage() {
  const [smiles, setSmiles] = useState('');
  const [target, setTarget] = useState('');
  const [indication, setIndication] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [svgError, setSvgError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Debounce molecular render
  useEffect(() => {
    if (!smiles.trim()) {
      setSvgContent(null);
      setSvgError(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/analyses/render?smiles=${encodeURIComponent(smiles.trim())}`);
        if (!res.ok) throw new Error('Invalid SMILES structure');
        const svgText = await res.text();
        setSvgContent(svgText);
        setSvgError(false);
      } catch (err) {
        setSvgContent(null);
        setSvgError(true);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [smiles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smiles.trim()) {
      setError("Please enter a SMILES string");
      return;
    }
    if (svgError) {
      setError("Cannot submit an invalid SMILES structure");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    const finalTarget = target.trim() || "General Targets";
    const finalIndication = indication.trim() || "General Therapeutics";

    try {
      const res = await fetch('http://localhost:8000/api/analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          smiles: smiles.trim(), 
          target: finalTarget, 
          indication: finalIndication 
        }),
      });
      
      if (!res.ok) {
        let errMsg = "Submission failed";
        try {
          const data = await res.json();
          errMsg = data.detail || errMsg;
        } catch (_) {}
        setError(errMsg);
        setLoading(false);
        return;
      }
      
      const data = await res.json();
      
      // Save newly created ID as the last viewed analysis ID
      localStorage.setItem('lastAnalysisId', data.analysis_id);
      
      router.push(`/analysis/${data.analysis_id}`);
    } catch (err) {
      console.error(err);
      setError("A network error occurred. Please verify your connection to the backend server.");
      setLoading(false);
    }
  };

  return (
    <main className="h-screen max-h-screen bg-background flex flex-col overflow-hidden">
      <Header />
      <div className="flex-grow flex flex-col w-full max-w-container-max mx-auto px-margin-desktop py-4 justify-between min-h-0 overflow-hidden">
        {/* Header Title Section */}
        <div className="mb-2 mt-1">
          <h2 className="text-headline-lg font-headline-lg text-primary mb-1">Molecular Submission</h2>
          <p className="text-body-sm text-on-surface-variant">Submit your novel chemical structures for deep-learning similarity scoring and patent landscape mapping.</p>
        </div>

        {/* Workspace Grid */}
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch min-h-0 mb-4">
          {/* Form Area (Left) */}
          <div className="xl:col-span-7 flex flex-col min-h-0">
            <section className="flex-1 bg-white border border-outline-variant rounded-xl p-5 md:p-6 flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[20px]">edit_note</span>
                </div>
                <h3 className="font-headline-md text-headline-md text-primary font-bold">Compound Discovery</h3>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between gap-4">
                {error && (
                  <div className="bg-rose-50 border border-rose-200/50 text-rose-700 px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">error_outline</span>
                    <span>{error}</span>
                  </div>
                )}

                {/* 1. SMILES Input (Required) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-on-surface ml-1">
                    SMILES String <span className="text-error">*</span>
                  </label>
                  <textarea 
                    value={smiles}
                    onChange={e => setSmiles(e.target.value)}
                    required
                    className={`w-full bg-surface-container-lowest border focus:ring-2 rounded-lg py-2 px-3 font-mono text-xs transition-all outline-none resize-none ${
                      svgError 
                        ? 'border-error focus:border-error focus:ring-error/20' 
                        : 'border-outline-variant focus:border-secondary focus:ring-secondary/20'
                    }`} 
                    placeholder="Enter molecular notation (e.g. CC(=O)OC1=CC=CC=C1C(=O)O)" 
                    rows={3}
                  ></textarea>
                </div>

                {/* 2. Secondary Optional Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs text-on-surface-variant ml-1 font-semibold">
                      Biological Target <span className="text-on-surface-variant/70">(Optional)</span>
                    </label>
                    <input 
                      type="text" 
                      value={target}
                      onChange={e => setTarget(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-outline-variant focus:border-secondary focus:ring-2 focus:ring-secondary/20 rounded-lg py-2 px-3 transition-all outline-none text-xs" 
                      placeholder="e.g. COX-2 Enzyme"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs text-on-surface-variant ml-1 font-semibold">
                      Therapeutic Indication <span className="text-on-surface-variant/70">(Optional)</span>
                    </label>
                    <input 
                      type="text" 
                      value={indication}
                      onChange={e => setIndication(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-outline-variant focus:border-secondary focus:ring-2 focus:ring-secondary/20 rounded-lg py-2 px-3 transition-all outline-none text-xs" 
                      placeholder="e.g. Inflammation"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={loading || !smiles.trim() || svgError}
                    className="w-full bg-primary text-on-primary py-3 px-6 rounded-lg text-sm shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 duration-100 disabled:opacity-50 font-bold"
                  >
                    {loading ? 'Launching Patent Scan...' : 'Submit Discovery Search'}
                    <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                  </button>
                </div>
              </form>
            </section>
          </div>

          {/* Rendering Area (Right) */}
          <div className="xl:col-span-5 flex flex-col min-h-0">
            <section className="flex-1 bg-white border border-outline-variant rounded-xl p-5 md:p-6 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <pattern id="grid-render-simplified" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5"></path>
                  </pattern>
                  <rect width="100%" height="100%" fill="url(#grid-render-simplified)"></rect>
                </svg>
              </div>

              <div className="flex justify-between items-start mb-4 z-10">
                <div>
                  <h3 className="font-headline-md text-headline-md text-primary font-bold">2D Molecular Render</h3>
                  <p className="text-[11px] text-on-surface-variant">Real-time structure validation</p>
                </div>
              </div>

              <div className="flex-1 rounded-xl bg-surface-container-lowest border border-dashed border-outline-variant flex items-center justify-center overflow-hidden relative group-hover:border-primary/40 transition-colors p-4 min-h-0">
                {svgContent ? (
                  <div 
                    className="w-full h-full flex items-center justify-center svg-container [&>svg]:max-w-full [&>svg]:max-h-full" 
                    dangerouslySetInnerHTML={{ __html: svgContent }} 
                  />
                ) : svgError ? (
                  <div className="text-center p-6">
                    <span className="material-symbols-outlined text-error text-3xl mb-2">error</span>
                    <p className="text-xs font-bold text-error">Invalid SMILES Notation</p>
                  </div>
                ) : (
                  <>
                    <div className="relative molecule-orb w-40 h-40 bg-white rounded-full shadow-xl flex items-center justify-center border border-outline-variant/30 z-20">
                      <div className="text-center p-6">
                        <div className="w-10 h-10 mx-auto mb-2 bg-primary-container rounded-2xl flex items-center justify-center text-on-primary-container">
                          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>biotech</span>
                        </div>
                        <p className="text-xs font-bold text-primary mb-0.5">C₁₈H₂₁NO₃</p>
                        <p className="text-[9px] text-on-surface-variant uppercase tracking-tighter">Ready for rendering</p>
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-secondary-container rounded-full border border-outline flex items-center justify-center text-secondary font-bold text-[10px]">O</div>
                      <div className="absolute -bottom-1 -left-4 w-7 h-7 bg-primary-fixed rounded-full border border-outline flex items-center justify-center text-primary font-bold text-[10px]">H₂</div>
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
