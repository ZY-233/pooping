import { Suspense } from "react";

import { FriendsPageClient } from "@/components/friends/friends-page-client";

export default function FriendsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-dvh w-full max-w-md items-center justify-center px-4 text-sm text-muted-foreground">
          加载中...
        </div>
      }
    >
      <FriendsPageClient />
    </Suspense>
  );
}
