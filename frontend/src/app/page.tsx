"use client";

import Link from 'next/link';
import { useEffect } from 'react';

export default function LandingPage() {
  useEffect(() => {
    // Add simple mouse movement effect on molecule placeholder
    const orb = document.querySelector('.molecule-orb') as HTMLElement;
    if (orb) {
      const handleMouseMove = (e: MouseEvent) => {
        const xAxis = (window.innerWidth / 2 - e.pageX) / 50;
        const yAxis = (window.innerHeight / 2 - e.pageY) / 50;
        orb.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg)`;
      };
      document.addEventListener('mousemove', handleMouseMove);
      return () => document.removeEventListener('mousemove', handleMouseMove);
    }
  }, []);

  return (
    <div className="bg-background text-on-surface font-body-md overflow-x-hidden min-h-screen flex flex-col w-full">
      {/* TopNavBar */}
      <header className="w-full top-0 sticky bg-surface/90 backdrop-blur-md border-b border-outline-variant z-50">
        <nav className="flex justify-between items-center px-margin-desktop py-3 w-full max-w-container-max mx-auto">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[32px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
            <span className="font-headline-md text-headline-md font-bold text-primary tracking-tight">PatentPilot</span>
          </div>
          <div>
            <Link href="/analysis/new" className="bg-primary text-on-primary font-label-md px-6 py-2.5 rounded-lg hover:opacity-90 shadow-sm transition-all text-sm font-bold">
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-grow flex flex-col justify-center">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-12 lg:py-16 px-margin-desktop bg-[radial-gradient(circle_at_top_right,#f2f4f2_0%,#f8faf8_100%)] flex-grow flex items-center">
          <div className="max-w-[1280px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-6 z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-container/10 text-primary border border-primary/20 font-label-sm w-fit">
                <span className="material-symbols-outlined text-[16px]">science</span>
                <span className="text-[11px] font-bold">Now Integrated with Public Data Repositories</span>
              </div>
              <div className="space-y-3">
                <h1 className="text-primary font-black tracking-tight leading-none text-[54px] lg:text-[76px]">
                  PatentPilot
                </h1>
                <h2 className="text-secondary font-semibold text-2xl lg:text-3xl leading-tight tracking-tight">
                  AI-Assisted Freedom-to-Operate (FTO) Workspace
                </h2>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-xl leading-relaxed">
                Perform initial patentability reviews, search global repositories, and synthesize AI-assisted report documentation using publicly available pharmaceutical and chemical data indexes.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <Link href="/analysis/new" className="bg-primary text-on-primary font-label-md text-label-md px-8 py-4.5 rounded-lg flex items-center gap-3 hover:opacity-95 shadow-lg shadow-primary/20 transition-all transform active:scale-95 duration-100 font-bold text-sm">
                  <span className="material-symbols-outlined">cloud_upload</span>
                  Molecular Search
                </Link>
              </div>
              <div className="flex gap-8 pt-6 border-t border-outline-variant max-w-lg">
                <div>
                  <div className="text-2xl lg:text-3xl font-bold text-primary tracking-tight">4.2M+</div>
                  <div className="text-[11px] text-on-surface-variant font-medium">Patents Indexed</div>
                </div>
                <div>
                  <div className="text-2xl lg:text-3xl font-bold text-primary tracking-tight">120k+</div>
                  <div className="text-[11px] text-on-surface-variant font-medium">Molecules Analyzed</div>
                </div>
                <div>
                  <div className="text-2xl lg:text-3xl font-bold text-primary tracking-tight">98%</div>
                  <div className="text-[11px] text-on-surface-variant font-medium">Clearance Rate</div>
                </div>
              </div>
            </div>

            {/* Right Visual Column (Reduced Width) */}
            <div className="lg:col-span-5 relative w-full flex justify-center lg:justify-end">
              <div className="relative w-full max-w-sm aspect-square rounded-[2rem] overflow-hidden border border-outline-variant shadow-2xl bg-white flex items-center justify-center p-6">
                {/* Simulated laboratory environment layout */}
                <div className="absolute inset-0 bg-gradient-to-tr from-surface-container-low to-surface-container-high/40 opacity-70"></div>
                <div className="absolute inset-0 pointer-events-none opacity-[0.05]">
                  <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <pattern id="grid-hero" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5"></path>
                    </pattern>
                    <rect width="100%" height="100%" fill="url(#grid-hero)"></rect>
                  </svg>
                </div>

                {/* Dynamic Molecule Orb */}
                <div className="relative molecule-orb w-52 h-52 bg-white rounded-full shadow-lg flex items-center justify-center border border-outline-variant/30 z-20 transition-transform duration-300 ease-out">
                  <div className="text-center p-6">
                    <div className="w-12 h-12 mx-auto mb-3 bg-primary-container rounded-xl flex items-center justify-center text-on-primary-container">
                      <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>biotech</span>
                    </div>
                    <p className="text-xs font-bold text-primary mb-1">C₁₈H₂₁NO₃</p>
                    <p className="text-[9px] text-on-surface-variant uppercase tracking-tighter">Ready for sequencing</p>
                  </div>
                  {/* Floating Atoms */}
                  <div className="absolute -top-2 -right-2 w-9 h-9 bg-secondary-container rounded-full border border-outline flex items-center justify-center text-secondary font-bold text-xs">O</div>
                  <div className="absolute -bottom-1 -left-4 w-8 h-8 bg-primary-fixed rounded-full border border-outline flex items-center justify-center text-primary font-bold text-[10px]">H₂</div>
                  <div className="absolute top-1/2 -left-6 w-7 h-7 bg-surface-variant rounded-full border border-outline flex items-center justify-center text-on-surface-variant font-bold text-[10px]">N</div>
                </div>

                <div className="absolute -bottom-2 -left-2 bg-white/95 backdrop-blur-sm p-3.5 rounded-xl border border-outline-variant shadow-lg max-w-[170px]">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary-fixed flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-[16px]">check_circle</span>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold">FTO Cleared</div>
                      <div className="text-[8px] text-on-surface-variant font-medium">Certainty: 94%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Bento Grid */}
        <section className="py-16 px-margin-desktop bg-surface border-t border-outline-variant/30">
          <div className="max-w-container-max mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-headline-lg text-headline-lg text-primary mb-3">Precision Intelligence for Drug Discovery</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xl mx-auto">Modern patent workflows designed for the intersection of traditional ethnobotany and advanced pharmaceutical research.</p>
            </div>

            <div className="grid grid-cols-12 gap-6">
              {/* AI-Assisted Analysis */}
              <div className="col-span-12 lg:col-span-8 p-8 rounded-2xl bg-surface-container-low border border-outline-variant group hover:shadow-md transition-all duration-300">
                <div className="flex flex-col md:flex-row gap-8 h-full">
                  <div className="flex-1">
                    <span className="material-symbols-outlined text-primary mb-4 text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                    <h3 className="font-headline-md text-headline-md text-primary mb-3 font-bold">AI-Assisted Analysis</h3>
                    <p className="text-body-sm text-body-sm text-on-surface-variant mb-6 leading-relaxed">
                      Our neural network analyzes chemical similarities and claim structures to identify potential infringement risks before they become legal liabilities.
                    </p>
                    <ul className="space-y-3 text-xs font-semibold">
                      <li className="flex items-center gap-2 text-on-surface">
                        <span className="material-symbols-outlined text-primary text-[8px]" style={{ fontVariationSettings: "'FILL' 1" }}>circle</span>
                        Structure-based search algorithms
                      </li>
                      <li className="flex items-center gap-2 text-on-surface">
                        <span className="material-symbols-outlined text-primary text-[8px]" style={{ fontVariationSettings: "'FILL' 1" }}>circle</span>
                        Natural language claim processing
                      </li>
                      <li className="flex items-center gap-2 text-on-surface">
                        <span className="material-symbols-outlined text-primary text-[8px]" style={{ fontVariationSettings: "'FILL' 1" }}>circle</span>
                        Sentiment & context mapping
                      </li>
                    </ul>
                  </div>
                  <div className="flex-1 rounded-xl bg-white border border-outline-variant/30 overflow-hidden min-h-[180px] p-6 flex flex-col justify-center gap-4">
                    <div className="flex justify-between items-center border-b border-outline-variant/30 pb-2">
                      <span className="text-[10px] font-bold text-primary uppercase">AI Risk Overview</span>
                      <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[9px] font-bold">REVIEW NEEDED</span>
                    </div>
                    <p className="text-xs italic text-on-surface-variant leading-relaxed">
                      "Claim 4 matches biological activity targets for inflammatory inhibition. Structural Tanimoto index suggests a 68% overlap."
                    </p>
                  </div>
                </div>
              </div>

              {/* Patent Discovery */}
              <div className="col-span-12 md:col-span-6 lg:col-span-4 p-8 rounded-2xl bg-white border border-outline-variant group hover:border-primary transition-all duration-300 flex flex-col">
                <span className="material-symbols-outlined text-primary mb-4 text-4xl">search_insights</span>
                <h3 className="font-headline-md text-headline-md text-primary mb-3 font-bold">Patent Discovery</h3>
                <p className="text-body-sm text-body-sm text-on-surface-variant mb-6 leading-relaxed">
                  Aggregate data from global repositories into a single, searchable workspace with real-time updates.
                </p>
                <div className="mt-auto pt-6 border-t border-outline-variant/50 flex gap-1">
                  <div className="px-3 py-1 rounded bg-primary-container/10 text-primary text-[10px] font-bold">USPTO</div>
                  <div className="px-3 py-1 rounded bg-secondary-container/20 text-secondary text-[10px] font-bold">EPO</div>
                  <div className="px-3 py-1 rounded bg-tertiary-fixed-dim/20 text-on-tertiary-fixed-variant text-[10px] font-bold">WIPO</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface text-on-surface py-12 px-margin-desktop border-t border-outline-variant w-full">
        <div className="max-w-container-max mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[24px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
            <span className="font-bold text-primary font-headline-md">PatentPilot</span>
          </div>
          <p className="text-on-surface-variant">© 2026 PatentPilot AI. Confidential Research Environment.</p>
          <div className="flex items-center gap-2">
            <span className="text-on-surface-variant">Powered by</span>
            <span className="font-bold text-primary uppercase">Centella AI Therapeutics</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
