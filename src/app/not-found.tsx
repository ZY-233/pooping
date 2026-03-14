import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-4 py-8">
      <Card className="w-full rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">页面走丢了</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            你访问的内容不存在，可能已被移动或删除。
          </p>
          <Button asChild className="h-10 w-full rounded-xl">
            <Link href="/">回到首页</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
