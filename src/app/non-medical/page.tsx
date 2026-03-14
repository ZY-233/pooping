import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NonMedicalPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-10 pt-6">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">说明</p>
            <h1 className="text-2xl font-semibold tracking-tight">非医疗说明</h1>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/me">返回</Link>
          </Button>
        </div>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">重要提示</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              今日顺顺仅用于个人日常记录，不提供医疗诊断、疾病判断或治疗建议。
            </p>
            <p>
              如果你有持续不适或身体异常，请及时咨询专业医生。
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
