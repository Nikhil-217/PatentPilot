"use client";

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

function HeaderContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);

  // Sync active analysis ID from localStorage on mount/pathname changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedId = localStorage.getItem('lastAnalysisId');
      if (storedId) {
        setActiveAnalysisId(storedId);
      }
      
      // If we are currently on an analysis page, capture the ID
      const match = pathname.match(/^\/analysis\/([a-f0-9]{24})/i);
      if (match && match[1]) {
        localStorage.setItem('lastAnalysisId', match[1]);
        setActiveAnalysisId(match[1]);
      }
    }
  }, [pathname]);

  // Determine active tab
  let activeTab = '';
  if (pathname === '/analysis/new') {
    activeTab = 'submission';
  } else if (pathname === '/history') {
    activeTab = 'history';
  } else if (pathname.startsWith('/analysis/')) {
    if (tabParam === 'ai') {
      activeTab = 'ai';
    } else if (tabParam === 'report') {
      activeTab = 'report';
    } else {
      activeTab = 'patents'; // default
    }
  }

  // Helper to build analysis links
  const getAnalysisLink = (tabName: string) => {
    if (!activeAnalysisId) return '#';
    return `/analysis/${activeAnalysisId}?tab=${tabName}`;
  };

  const hasActiveAnalysis = !!activeAnalysisId;

  return (
    <div className="flex justify-between items-center px-margin-desktop py-4 w-full max-w-container-max mx-auto">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2.5 mr-4">
          <span className="material-symbols-outlined text-[28px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
          <span className="font-bold text-primary tracking-tight text-lg">PatentPilot</span>
        </Link>
        
        {/* Unified 5-Tab Navigation Bar */}
        <nav className="hidden md:flex gap-1.5 items-center bg-surface-container-low border border-outline-variant/40 p-1.5 rounded-xl">
          <Link 
            href="/analysis/new"
            className={`px-5 py-2.5 rounded-lg text-[13px] font-bold transition-all ${
              activeTab === 'submission' 
                ? 'bg-primary text-on-primary shadow-sm' 
                : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-high/40'
            }`}
          >
            Molecular Submission
          </Link>

          {hasActiveAnalysis ? (
            <Link 
              href={getAnalysisLink('patents')}
              className={`px-5 py-2.5 rounded-lg text-[13px] font-bold transition-all ${
                activeTab === 'patents' 
                  ? 'bg-primary text-on-primary shadow-sm' 
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-high/40'
              }`}
            >
              Patent Reports
            </Link>
          ) : (
            <span 
              title="Submit a molecule to unlock patent reports"
              className="px-5 py-2.5 rounded-lg text-[13px] font-bold text-outline-variant cursor-not-allowed opacity-50 select-none"
            >
              Patent Reports
            </span>
          )}

          {hasActiveAnalysis ? (
            <Link 
              href={getAnalysisLink('ai')}
              className={`px-5 py-2.5 rounded-lg text-[13px] font-bold transition-all ${
                activeTab === 'ai' 
                  ? 'bg-primary text-on-primary shadow-sm' 
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-high/40'
              }`}
            >
              AI Analysis
            </Link>
          ) : (
            <span 
              title="Submit a molecule to unlock AI analysis"
              className="px-5 py-2.5 rounded-lg text-[13px] font-bold text-outline-variant cursor-not-allowed opacity-50 select-none"
            >
              AI Analysis
            </span>
          )}

          {hasActiveAnalysis ? (
            <Link 
              href={getAnalysisLink('report')}
              className={`px-5 py-2.5 rounded-lg text-[13px] font-bold transition-all ${
                activeTab === 'report' 
                  ? 'bg-primary text-on-primary shadow-sm' 
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-high/40'
              }`}
            >
              Executability Report
            </Link>
          ) : (
            <span 
              title="Submit a molecule to unlock executability reports"
              className="px-5 py-2.5 rounded-lg text-[13px] font-bold text-outline-variant cursor-not-allowed opacity-50 select-none"
            >
              Executability Report
            </span>
          )}

          <Link 
            href="/history"
            className={`px-5 py-2.5 rounded-lg text-[13px] font-bold transition-all ${
              activeTab === 'history' 
                ? 'bg-primary text-on-primary shadow-sm' 
                : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-high/40'
            }`}
          >
            History
          </Link>
        </nav>
      </div>
      
      <div className="flex items-center gap-4 text-xs font-semibold text-on-surface-variant">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
        <span className="text-[10px] text-primary font-bold uppercase tracking-wider">SYSTEM ONLINE</span>
      </div>
    </div>
  );
}

export default function Header() {
  return (
    <header className="w-full sticky top-0 bg-surface/90 backdrop-blur-md border-b border-outline-variant z-50">
      <Suspense fallback={
        <div className="flex justify-between items-center px-margin-desktop py-4.5 w-full max-w-container-max mx-auto h-[53px]">
          <span className="text-xs text-primary font-bold">PatentPilot</span>
        </div>
      }>
        <HeaderContent />
      </Suspense>
    </header>
  );
}
