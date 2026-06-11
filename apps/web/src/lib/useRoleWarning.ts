'use client';

// debounced de-anon guard for role titles — calls the role-check edge
// function, falling back to the prototype's local regex when offline.
import { useEffect, useRef, useState } from 'react';
import { roleCheck } from '@unsaid/api';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export const ROLE_WARNING_FALLBACK = 'that might point right at you — try a broader title 🤍';
export const ROLE_HELPER = 'this is the only thing people see — never your name';

const DEBOUNCE_MS = 450;

function localGuard(txt: string): string | null {
  const t = txt.toLowerCase();
  const named =
    /\b(at|@)\s+[a-z]/.test(t) ||
    /\b(google|meta|amazon|infosys|tcs|deloitte|kpmg|microsoft|apple)\b/.test(t);
  const place = /\b(gurgaon|bangalore|mumbai|delhi|noida|pune|seattle|london|sf|nyc)\b/.test(t);
  return named || place ? ROLE_WARNING_FALLBACK : null;
}

export function useRoleWarning(value: string): string | null {
  const [warning, setWarning] = useState<string | null>(null);
  const seq = useRef(0);
  useEffect(() => {
    const mine = ++seq.current;
    if (!value.trim()) {
      setWarning(null);
      return;
    }
    const t = window.setTimeout(() => {
      const sb = createSupabaseBrowserClient();
      roleCheck(sb, value.trim())
        .then((res) => {
          if (seq.current !== mine) return;
          setWarning(res.ok ? null : (res.warning ?? ROLE_WARNING_FALLBACK));
        })
        .catch(() => {
          if (seq.current !== mine) return;
          setWarning(localGuard(value));
        });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [value]);
  return warning;
}
