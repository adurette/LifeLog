"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/report-error";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { void reportError(error); }, [error]);
  return <main className="error-page"><div><h1>Something went sideways.</h1><p>Your saved data is safe. Try loading this view again.</p><button onClick={reset}>Try again</button></div></main>;
}
