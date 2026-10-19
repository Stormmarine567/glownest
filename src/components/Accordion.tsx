'use client';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export function Accordion({ items }: { items: { id: string; question: string; answer: string }[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <ul className="space-y-3">
      {items.map((it) => {
        const isOpen = open === it.id;
        return (
          <li key={it.id} className="overflow-hidden rounded-xl border border-line bg-white shadow-soft">
            <h3 className="font-sans">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`faq-${it.id}`}
                onClick={() => setOpen(isOpen ? null : it.id)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-[13.5px] font-medium text-ink"
              >
                {it.question}
                <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
              </button>
            </h3>
            <div id={`faq-${it.id}`} role="region" className={`grid transition-all duration-300 ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
              <div className="overflow-hidden"><p className="px-5 pb-5 text-[13.5px] leading-7 text-muted">{it.answer}</p></div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
