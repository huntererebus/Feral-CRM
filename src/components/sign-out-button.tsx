import { signOut } from "@/lib/auth";

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut();
      }}
    >
      <button type="submit" className="text-sm text-neutral-400 hover:text-neutral-100">
        Sign out
      </button>
    </form>
  );
}
