import { oauthSignInAction } from "./actions";
import { Button } from "@/components/ui/button";

export function OAuthButtons() {
  return (
    <div className="flex flex-col gap-2">
      <form action={oauthSignInAction.bind(null, "google")}>
        <Button type="submit" variant="secondary" className="w-full">
          Continue with Google
        </Button>
      </form>
      <form action={oauthSignInAction.bind(null, "apple")}>
        <Button type="submit" variant="secondary" className="w-full">
          Continue with Apple
        </Button>
      </form>
    </div>
  );
}
