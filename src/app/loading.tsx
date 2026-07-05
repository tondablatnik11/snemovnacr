import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="container py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin" />
      <p className="text-sm">Načítám…</p>
    </div>
  );
}