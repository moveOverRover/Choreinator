"use client";

export function PrintButton() {
  return (
    <button className="btn ml-auto" onClick={() => window.print()}>
      Print
    </button>
  );
}
