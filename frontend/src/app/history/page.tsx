"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';

interface AnalysisRecord {
  _id: string;
  smiles_input: string;
  target?: string;
  indication?: string;
  status: string;
  overall_recommendation?: string;
  created_at: string;
}

export default function HistoryPage() {
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:8000/api/analyses')
      .then(res => res.json())
      .then(data => {
        setAnalyses(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const getRiskBadge = (rec?: string, status?: string) => {
    if (status !== 'reported' && status !== 'ready_for_review') {
      return (
        <span className="px-2.5 py-0.5 rounded bg-surface-variant text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">
          Processing
        </span>
      );
    }
    
    if (rec === 'high_risk') {
      return (
        <span className="px-2.5 py-0.5 rounded bg-error-container text-on-error-container text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-error"></span> High Risk
        </span>
      );
    }
    if (rec === 'requires_review') {
      return (
        <span className="px-2.5 py-0.5 rounded bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> Review Required
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded bg-primary-fixed text-on-primary-fixed-variant text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit">
        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span> Low Risk
      </span>
    );
  };

  return (
    <main className="flex-grow min-h-screen bg-background flex flex-col overflow-x-hidden">
      <Header />
      <div className="p-margin-mobile md:p-gutter flex-1 w-full max-w-container-max mx-auto flex flex-col mt-6">
        <header className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-primary font-bold">Analysis History</h2>
            <p className="text-body-sm text-on-surface-variant mt-1.5">
              Review and manage your computational pharmacology reports and molecular patentability assessments.
            </p>
          </div>
        </header>

        <div className="flex-1 bg-white rounded-xl border border-outline-variant overflow-hidden shadow-[0_4px_12px_rgba(35,71,43,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant text-[11px] uppercase tracking-wider text-primary">
                  <th className="px-6 py-4 font-bold">Date</th>
                  <th className="px-6 py-4 font-bold">SMILES String</th>
                  <th className="px-6 py-4 font-bold">Biological Target</th>
                  <th className="px-6 py-4 font-bold">Disease Indication</th>
                  <th className="px-6 py-4 font-bold">Strategic Assessment</th>
                  <th className="px-6 py-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 text-xs text-on-surface">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant font-bold">
                      <div className="flex items-center justify-center gap-2">
                        <span className="animate-spin material-symbols-outlined text-primary">sync</span>
                        <span>Loading historical logs...</span>
                      </div>
                    </td>
                  </tr>
                ) : analyses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant font-medium">
                      No historical submissions recorded.
                    </td>
                  </tr>
                ) : (
                  analyses.map((record) => (
                    <tr key={record._id} className="hover:bg-surface-container-low/40 transition-colors group">
                      <td className="px-6 py-4 text-on-surface-variant font-medium">
                        {new Date(record.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-primary truncate max-w-[200px]" title={record.smiles_input}>
                        {record.smiles_input}
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant font-semibold">{record.target || '-'}</td>
                      <td className="px-6 py-4 text-on-surface-variant font-semibold">{record.indication || '-'}</td>
                      <td className="px-6 py-4">
                        {getRiskBadge(record.overall_recommendation, record.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link 
                          href={`/analysis/${record._id}`} 
                          className="bg-primary-container text-primary px-3 py-1.5 rounded font-bold text-[10px] uppercase hover:bg-primary-fixed transition-colors"
                        >
                          Workspace
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
