// Screen-size resolver. A single source of truth for layout breakpoints so the
// Shell can reflow (e.g. the Studio rail becomes a bottom sheet on phones)
// instead of scattering magic widths across components.

import { useEffect, useState } from "react";

/** Phone-width and below. iPad portrait (768px) stays on the roomy layout. */
const PHONE_QUERY = "(max-width: 740px)";

function matches(query: string): boolean {
  return typeof window !== "undefined" && window.matchMedia(query).matches;
}

/** True when the viewport is phone-width. Re-renders on rotate/resize. */
export function usePhoneLayout(): boolean {
  const [isPhone, setIsPhone] = useState(() => matches(PHONE_QUERY));
  useEffect(() => {
    const mq = window.matchMedia(PHONE_QUERY);
    const onChange = (): void => setIsPhone(mq.matches);
    mq.addEventListener("change", onChange);
    onChange(); // sync in case it changed before the listener attached
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isPhone;
}
