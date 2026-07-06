"use client";

import GlobalError from "~/components/error-boundary";

// Next.js App Router vyžaduje, aby error.tsx byl Client Component
// (reset callback je interaktivní handler).
export default GlobalError;