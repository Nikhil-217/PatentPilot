"use client";

import { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ReportRedirectPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  useEffect(() => {
    // Redirect to the main analysis dashboard where the report is integrated as Tab 4
    router.replace(`/analysis/${id}`);
  }, [id, router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center text-sm font-bold text-primary animate-pulse">
        Loading Report Section...
      </div>
    </div>
  );
}
