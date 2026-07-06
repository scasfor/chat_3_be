"use client";

import { useLogin } from "@refinedev/core";
import { Button, Card, Form, Input, Layout, Typography, Alert } from "antd";
import { LockOutlined, MailOutlined } from "@ant-design/icons";

type LoginVariables = { email: string; password: string };

export default function LoginPage() {
  const { mutate: login, isPending, error } = useLogin<LoginVariables>();

  return (
    <Layout style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Card style={{ width: 380 }}>
        <Typography.Title level={3} style={{ textAlign: "center", marginBottom: 4 }}>
          COI Bot Admin
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ textAlign: "center", marginBottom: 24 }}>
          Sign in to manage the chatbot
        </Typography.Paragraph>

        {error ? (
          <Alert
            type="error"
            message={error.message ?? "Invalid email or password."}
            style={{ marginBottom: 16 }}
            showIcon
          />
        ) : null}

        <Form<LoginVariables> layout="vertical" onFinish={(values) => login(values)} requiredMark={false}>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, message: "Email is required" }, { type: "email" }]}
          >
            <Input prefix={<MailOutlined />} placeholder="admin@example.com" autoComplete="email" />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, message: "Password is required" }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="••••••••" autoComplete="current-password" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block loading={isPending}>
              Sign in
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </Layout>
  );
}
