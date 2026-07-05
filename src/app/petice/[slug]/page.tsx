import { notFound } from "next/navigation";
import { PetitionIcon } from "lucide-react";
import { getServerCaller } from "~/server/trpc/caller";
import { PetitionSignForm } from "~/components/petice/petition-sign-form";

export default async function PeticeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const caller = await getServerCaller();
  const p = await caller.petice.detail({ slug });
  if (!p) notFound();

  const progress = Math.min(100, ((p.signatureCount ?? 0) / p.cilovyPocet) * 100);

  return (
    <div className="container max-w-3xl py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
          <PetitionIcon className="h-7 w-7 text-primary" />
          {p.title}
        </h1>
        <div className="text-sm text-muted-foreground">
          Cíl: {p.cilovyPocet} podpisů · Aktuálně: {p.signatureCount} ({Math.round(progress)}%)
        </div>
      </header>

      <div className="h-2 rounded-full bg-muted overflow-hidden mb-8">
        <div className="bg-primary h-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      <article className="prose prose-sm dark:prose-invert max-w-none mb-8">
        {p.bodyMd.split("\n").map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </article>

      <section className="border-t border-border pt-8">
        <h2 className="text-xl font-semibold mb-3">Podepsat petici</h2>
        <PetitionSignForm peticeId={p.id} />
      </section>
    </div>
  );
}