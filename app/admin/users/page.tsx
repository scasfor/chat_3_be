"use client";

import { useState } from "react";
import { CreateButton, DeleteButton, List, useModalForm, useTable } from "@refinedev/antd";
import { useInvalidate } from "@refinedev/core";
import { App, Button, Form, Input, Modal, Space, Switch, Table } from "antd";
import { KeyOutlined } from "@ant-design/icons";

type UserRow = {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
};

export default function UsersPage() {
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  const refresh = () => invalidate({ resource: "users", invalidates: ["list"] });

  const { tableProps } = useTable<UserRow>({
    resource: "users",
    sorters: { initial: [{ field: "createdAt", order: "desc" }] },
  });

  const { formProps, modalProps, show } = useModalForm<UserRow>({
    resource: "users",
    action: "create",
    onMutationSuccess: refresh,
  });

  const toggleActive = async (record: UserRow) => {
    const res = await fetch(`/api/admin/users/${record.id}/toggle-active`, { method: "POST" });
    if (!res.ok) {
      message.error("Failed to update user status.");
      return;
    }
    refresh();
  };

  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [resetForm] = Form.useForm();
  const [resetting, setResetting] = useState(false);

  const submitReset = async () => {
    const values = await resetForm.validateFields();
    setResetting(true);
    try {
      const res = await fetch(`/api/admin/users/${resetTarget?.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: values.password }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message ?? "Request failed");
      message.success("Password reset successfully.");
      setResetTarget(null);
      resetForm.resetFields();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Failed to reset password.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <List title="Users" headerButtons={<CreateButton onClick={() => show()}>Create</CreateButton>}>
      <Table {...tableProps} rowKey="id">
        <Table.Column title="Name" dataIndex="name" />
        <Table.Column title="Email" dataIndex="email" />
        <Table.Column<UserRow>
          title="Active"
          dataIndex="isActive"
          render={(isActive: boolean, record) => (
            <Switch checked={isActive} checkedChildren="Active" unCheckedChildren="Inactive" onChange={() => toggleActive(record)} />
          )}
        />
        <Table.Column<UserRow>
          title="Created"
          dataIndex="createdAt"
          render={(value: string) => new Date(value).toLocaleDateString()}
        />
        <Table.Column<UserRow>
          title="Actions"
          width={200}
          render={(_, record) => (
            <Space>
              <Button size="small" icon={<KeyOutlined />} onClick={() => setResetTarget(record)}>
                Reset Password
              </Button>
              <DeleteButton size="small" hideText recordItemId={record.id} resource="users" />
            </Space>
          )}
        />
      </Table>

      <Modal {...modalProps} forceRender title="Create User">
        <Form {...formProps} layout="vertical">
          <Form.Item label="Name" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Email" name="email" rules={[{ required: true, type: "email" }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Password" name="password" rules={[{ required: true, min: 8 }]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        forceRender
        title={`Reset Password: ${resetTarget?.name ?? ""}`}
        open={resetTarget !== null}
        onCancel={() => setResetTarget(null)}
        onOk={submitReset}
        confirmLoading={resetting}
      >
        <Form form={resetForm} layout="vertical">
          <Form.Item label="New Password" name="password" rules={[{ required: true, min: 8 }]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </List>
  );
}
