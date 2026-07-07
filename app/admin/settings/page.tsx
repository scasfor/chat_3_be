"use client";

import { useEffect, useState } from "react";
import { useTranslate } from "@refinedev/core";
import { App, Button, Card, Form, Input, Skeleton, Typography } from "antd";

export default function SettingsPage() {
  const translate = useTranslate();
  const { message } = App.useApp();
  const [initialValues, setInitialValues] = useState<{ geminiApiKey: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => setInitialValues({ geminiApiKey: data.geminiApiKey ?? "" }))
      .finally(() => setLoading(false));
  }, []);

  const onFinish = async (values: { geminiApiKey: string }) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geminiApiKey: values.geminiApiKey || null }),
      });
      if (!res.ok) throw new Error(translate("settings.saveFailed"));
      message.success(translate("settings.saveSuccess"));
    } catch (error) {
      message.error(error instanceof Error ? error.message : translate("settings.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title={translate("settings.title")} style={{ maxWidth: 640 }}>
      <Typography.Title level={5}>{translate("settings.aiConfig")}</Typography.Title>
      <Typography.Paragraph type="secondary">{translate("settings.aiDescription")}</Typography.Paragraph>

      {loading || !initialValues ? (
        <Skeleton active paragraph={{ rows: 2 }} />
      ) : (
        <Form layout="vertical" initialValues={initialValues} onFinish={onFinish}>
          <Form.Item label={translate("settings.geminiApiKey")} name="geminiApiKey">
            <Input.Password visibilityToggle placeholder={translate("settings.geminiPlaceholder")} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saving}>
              {translate("settings.save")}
            </Button>
          </Form.Item>
        </Form>
      )}
    </Card>
  );
}
