"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { useToast } from "@/components/feedback/toast-provider";
import { RecordDrawer } from "@/components/records/record-drawer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ensureClientUser } from "@/lib/supabase/auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  getRecordById,
  softDeletePoopRecord,
  type RecordItem,
} from "@/services/record.service";
import type { FeelingType, ShapeType } from "@/types/database";

const shapeLabelMap: Record<ShapeType, string> = {
  dry: "偏干",
  normal: "正常",
  loose: "偏稀",
};

const feelingLabelMap: Record<FeelingType, string> = {
  smooth: "很顺",
  normal: "一般",
  hard: "有点费劲",
  urgent: "很急",
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RecordDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [record, setRecord] = useState<RecordItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { showToast } = useToast();

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const auth = await ensureClientUser();
    if (auth.errorMessage || !auth.user) {
      setLoading(false);
      setErrorMessage(auth.errorMessage ?? "登录状态异常，请刷新重试。");
      return;
    }

    setUserId(auth.user.id);
    const supabase = getSupabaseBrowserClient();
    const detail = await getRecordById(supabase, {
      id: params.id,
      userId: auth.user.id,
    });

    if (detail.error) {
      setLoading(false);
      setErrorMessage(detail.error.message);
      showToast("读取记录失败", "error");
      return;
    }

    if (!detail.data) {
      setLoading(false);
      setErrorMessage("这条记录不存在，或已被删除。");
      return;
    }

    setRecord(detail.data);
    setLoading(false);
  }, [params.id, showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadDetail();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadDetail]);

  const handleDelete = async () => {
    if (!record || !userId) {
      return;
    }
    setDeleting(true);

    const supabase = getSupabaseBrowserClient();
    const result = await softDeletePoopRecord(supabase, { id: record.id, userId });
    setDeleting(false);
    setDeleteOpen(false);

    if (result.error) {
      setErrorMessage(result.error.message);
      showToast("删除失败，请重试。", "error");
      return;
    }

    showToast("记录已删除", "success");
    router.replace("/");
  };

  const handleSaved = (nextRecord: RecordItem) => {
    setRecord(nextRecord);
    setSuccessMessage("记录已更新");
    showToast("记录已更新", "success");
    setTimeout(() => setSuccessMessage(null), 1500);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">记录详情</p>
          <h1 className="text-2xl font-semibold tracking-tight">查看 / 编辑</h1>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/">返回首页</Link>
        </Button>
      </div>

      {loading ? (
        <Card className="rounded-2xl">
          <CardContent className="space-y-3 p-4">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-52" />
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">记录信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">时间：</span>
            {record ? formatDateTime(record.record_time) : "-"}
          </p>
          <p>
            <span className="text-muted-foreground">形状：</span>
            {record?.shape_type ? shapeLabelMap[record.shape_type] : "未填写"}
          </p>
          <p>
            <span className="text-muted-foreground">感受：</span>
            {record?.feeling_type ? feelingLabelMap[record.feeling_type] : "未填写"}
          </p>
          <p>
            <span className="text-muted-foreground">备注：</span>
            {record?.note || "未填写"}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <Button
          className="h-10 rounded-xl"
          onClick={() => setDrawerOpen(true)}
          disabled={!record || !userId}
        >
          编辑记录
        </Button>
        <Button
          className="h-10 rounded-xl"
          variant="destructive"
          onClick={() => setDeleteOpen(true)}
          disabled={!record || !userId}
        >
          删除记录
        </Button>
      </div>

      {successMessage ? (
        <Card className="rounded-2xl border-accent bg-accent/25">
          <CardContent className="p-4 text-sm">{successMessage}</CardContent>
        </Card>
      ) : null}

      {errorMessage ? (
        <Card className="rounded-2xl border-destructive/40">
          <CardContent className="p-4 text-sm text-destructive">
            {errorMessage}
          </CardContent>
        </Card>
      ) : null}

      {loading ? <p className="text-sm text-muted-foreground">加载中...</p> : null}

      {userId && record ? (
        <RecordDrawer
          open={drawerOpen}
          mode="edit"
          userId={userId}
          record={record}
          onClose={() => setDrawerOpen(false)}
          onSaved={handleSaved}
        />
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        title="确认删除这条记录吗？"
        description="删除后就找不回来了。"
        confirmLabel="确认删除"
        destructive
        loading={deleting}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </section>
  );
}
