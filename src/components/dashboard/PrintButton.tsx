'use client';
export function PrintButton() {
  return <button onClick={() => window.print()} className="btn btn-primary h-10 print:hidden">Print / Save as PDF</button>;
}
