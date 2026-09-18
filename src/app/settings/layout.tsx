import { AuthenticatedShell } from "@/components/authenticated-shell";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
