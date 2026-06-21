// Plain (non-client) formatting helpers so server components can call them
// directly. Keeping these out of the "use client" form-components module avoids
// "called a client function from the server" errors.

export function money(value: string | number | null) {
  if (value === null) return "0";
  return Number(value).toFixed(0);
}
