import { AuthenticatedShell } from "@/components/authenticated-shell";

export default function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
