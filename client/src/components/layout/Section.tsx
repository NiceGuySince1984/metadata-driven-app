import type { ReactNode } from 'react';

interface SectionProps {
  title: string;
  children: ReactNode;
}

export default function Section({ title, children }: SectionProps) {
  return (
    <div className="mb-8 animate-fade-up">
      <div className="mb-5 flex items-center gap-4">
        <div className="h-px flex-1 bg-slate-100" />
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
          {title}
        </h3>
        <div className="h-px flex-1 bg-slate-100" />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {children}
      </div>
    </div>
  );
}
