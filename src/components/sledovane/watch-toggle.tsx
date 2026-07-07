"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { api } from "~/trpc/client";

export function WatchToggle({
  targetType,
  targetId,
}: {
  targetType: "HLASOVANI" | "TISK" | "POSLANEC" | "KLUB" | "REC" | "PETICE";
  targetId: string;
}) {
  const [watching, setWatching] = useState(false);
  const utils = api.useUtils();
  const check = api.sledovane.isWatching.useQuery({ targetType, targetId });
  const toggle = api.sledovane.toggle.useMutation({
    onSuccess: (data) => {
      setWatching(data.watching);
      utils.sledovane.isWatching.invalidate({ targetType, targetId });
      if (data.watching) {
        toast.success("Sleduješ", {
          description: "Dostaneš notifikaci při nových událostech.",
        });
      } else {
        toast.info("Sledování zrušeno");
      }
    },
    onError: (e) => {
      toast.error("Nepodařilo se změnit sledování", {
        description: e.message,
      });
    },
  });

  // Sync local state with query result
  useEffect(() => {
    if (check.data !== undefined) setWatching(check.data);
  }, [check.data]);

  if (check.isLoading) return null;

  return (
    <button
      type="button"
      onClick={() => toggle.mutate({ targetType, targetId })}
      disabled={toggle.isPending}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border hover:bg-muted text-sm disabled:opacity-50 transition-colors"
    >
      {watching ? (
        <>
          <Bell className="h-3.5 w-3.5 fill-current" />
          Sleduješ
        </>
      ) : (
        <>
          <BellOff className="h-3.5 w-3.5" />
          Sledovat
        </>
      )}
    </button>
  );
}