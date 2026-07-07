"use client";

import { useLogin, useTranslate } from "@refinedev/core";
import { Button, Card, Form, Input, Layout, Typography, Alert } from "antd";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { t } from "@/lib/i18n";

type LoginVariables = { email: string; password: string };

export default function LoginPage() {
  const translate = useTranslate();
  const { mutate: login, isPending, error } = useLogin<LoginVariables>();

  return (
    <Layout style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Card style={{ width: 380 }}>
        <Typography.Title level={3} style={{ textAlign: "center", marginBottom: 4 }}>
          {translate("app.title")}
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ textAlign: "center", marginBottom: 24 }}>
          {translate("auth.signInSubtitle")}
        </Typography.Paragraph>

        {error ? (
          <Alert
            type="error"
            message={error.message ?? t("auth.invalidCredentials")}
            style={{ marginBottom: 16 }}
            showIcon
          />
        ) : null}

        <Form<LoginVariables> layout="vertical" onFinish={(values) => login(values)} requiredMark={false}>
          <Form.Item
            name="email"
            label={translate("common.email")}
            rules={[{ required: true, message: translate("auth.emailRequired") }, { type: "email" }]}
          >
            <Input prefix={<MailOutlined />} placeholder={translate("auth.emailPlaceholder")} autoComplete="email" />
          </Form.Item>
          <Form.Item
            name="password"
            label={translate("common.password")}
            rules={[{ required: true, message: translate("auth.passwordRequired") }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="••••••••" autoComplete="current-password" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block loading={isPending}>
              {translate("auth.signIn")}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </Layout>
  );
}
