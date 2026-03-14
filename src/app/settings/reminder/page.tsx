"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { useToast } from "@/components/feedback/toast-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  getUserSettings,
  upsertUserSettings,
  updateUserSettings,
} from "@/services/settings.service";
import type { ReminderStyle } from "@/types/database";

type SettingsForm = {
  reminderEnabled: boolean;
  reminderTime: string;
  reminderStyle: ReminderStyle;
};

const defaultForm: SettingsForm = {
  reminderEnabled: false,
  reminderTime: "",
  reminderStyle: "gentle",
};

export default function ReminderSettingsPage() {
  const { user, isGuest, isLoading } = useAuth();
  const [form, setForm] = useState<SettingsForm>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { showToast } = useToast();

  const loadSettings = useCallback(async () => {
    if (!user || isGuest) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const supabase = getSupabaseBrowserClient();
    const result = await getUserSettings(supabase, user.id);

    if (result.error) {
      setLoading(false);
      setErrorMessage(result.error.message);
      showToast(result.error.message, "error");
      return;
    }

    if (result.data) {
      setForm({
        reminderEnabled: result.data.reminder_enabled,
        reminderTime: result.data.reminder_time ?? "",
        reminderStyle: result.data.reminder_style,
      });
      setLoading(false);
      return;
    }

    const inserted = await upsertUserSettings(supabase, {
      user_id: user.id,
      reminder_enabled: false,
      reminder_style: "gentle",
      reminder_time: null,
    });

    if (inserted.error || !inserted.data) {
      setErrorMessage(inserted.error?.message ?? "初始化设置失败");
      showToast(inserted.error?.message ?? "初始化设置失败", "error");
      setLoading(false);
      return;
    }

    setForm({
      reminderEnabled: inserted.data.reminder_enabled,
      reminderTime: inserted.data.reminder_time ?? "",
      reminderStyle: inserted.data.reminder_style,
    });
    setLoading(false);
  }, [isGuest, showToast, user]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadSettings();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadSettings]);

  const saveSettings = async () => {
    if (!user || isGuest) {
      return;
    }

    if (form.reminderEnabled && !form.reminderTime) {
      setErrorMessage("开启提醒时请设置提醒时间。");
      showToast("请设置提醒时间", "error");
      return;
    }

    setSaving(true);
    setMessage(null);
    setErrorMessage(null);

    const supabase = getSupabaseBrowserClient();
    const result = await updateUserSettings(supabase, {
      userId: user.id,
      patch: {
        reminder_enabled: form.reminderEnabled,
        reminder_time: form.reminderEnabled ? form.reminderTime || null : null,
        reminder_style: form.reminderStyle,
      },
    });

    setSaving(false);

    if (result.error) {
      setErrorMessage(result.error.message);
      showToast(result.error.message, "error");
      return;
    }

    setMessage("提醒设置已保存");
    showToast("提醒设置已保存", "success");
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-10 pt-6">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">设置</p>
            <h1 className="text-2xl font-semibold tracking-tight">提醒设置</h1>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/me">返回</Link>
          </Button>
        </div>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">每日提醒</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading || loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ) : null}

            {!isLoading && isGuest ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  当前为游客态，登录后可保存提醒设置。
                </p>
                <Button asChild className="h-10 w-full rounded-xl">
                  <Link href="/login">去登录</Link>
                </Button>
              </div>
            ) : null}

            {!isLoading && !isGuest ? (
              <>
                <label className="flex items-center justify-between rounded-xl border p-3 text-sm">
                  <span>开启每日提醒</span>
                  <input
                    type="checkbox"
                    checked={form.reminderEnabled}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        reminderEnabled: e.target.checked,
                      }))
                    }
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-sm">提醒时间</span>
                  <input
                    type="time"
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                    value={form.reminderTime}
                    disabled={!form.reminderEnabled}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        reminderTime: e.target.value,
                      }))
                    }
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-sm">提醒风格</span>
                  <select
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                    value={form.reminderStyle}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        reminderStyle: e.target.value as ReminderStyle,
                      }))
                    }
                  >
                    <option value="gentle">温柔型</option>
                    <option value="cute">可爱型</option>
                  </select>
                </label>

                <Button
                  className="h-10 w-full rounded-xl"
                  disabled={saving}
                  onClick={saveSettings}
                >
                  {saving ? "保存中..." : "保存设置"}
                </Button>
              </>
            ) : null}

            {message ? <p className="text-sm text-primary">{message}</p> : null}
            {errorMessage ? (
              <p className="text-sm text-destructive">{errorMessage}</p>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
