import { TRPCProvider } from "~/trpc/client";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TRPCProvider>
      {children}
      <Toaster richColors position="top-right" />
    </TRPCProvider>
  );
}