"use client";

import { useEffect, useState } from "react";
import { App, Button, Card, Form, Input, Skeleton, Typography } from "antd";

export default function SettingsPage() {
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
      if (!res.ok) throw new Error("Failed to save settings");
      message.success("Settings saved successfully.");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Settings" style={{ maxWidth: 640 }}>
      <Typography.Title level={5}>AI Configuration</Typography.Title>
      <Typography.Paragraph type="secondary">
        Configure external AI service credentials used for bulk intent imports.
      </Typography.Paragraph>

      {loading || !initialValues ? (
        <Skeleton active paragraph={{ rows: 2 }} />
      ) : (
        <Form layout="vertical" initialValues={initialValues} onFinish={onFinish}>
          <Form.Item label="Gemini API Key" name="geminiApiKey">
            <Input.Password visibilityToggle placeholder="AIza..." />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saving}>
              Save Settings
            </Button>
          </Form.Item>
        </Form>
      )}
    </Card>
  );
}
