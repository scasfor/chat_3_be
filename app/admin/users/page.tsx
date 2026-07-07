"use client";

import { useState } from "react";
import { CreateButton, DeleteButton, List, useModalForm, useTable } from "@refinedev/antd";
import { useInvalidate, useTranslate } from "@refinedev/core";
import { App, Button, Form, Input, Modal, Space, Switch, Table } from "antd";
import { KeyOutlined } from "@ant-design/icons";
import { DATE_LOCALE } from "@/lib/i18n";
import { useIsClient } from "@/lib/hooks/useIsClient";

type UserRow = {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
};

export default function UsersPage() {
  const translate = useTranslate();
  const isClient = useIsClient();
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
      message.error(translate("users.toggleFailed"));
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
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message ?? translate("common.requestFailed"));
      message.success(translate("users.resetSuccess"));
      setResetTarget(null);
      resetForm.resetFields();
    } catch (error) {
      message.error(error instanceof Error ? error.message : translate("users.resetFailed"));
    } finally {
      setResetting(false);
    }
  };

  return (
    <List
      title={translate("users.title")}
      headerButtons={<CreateButton onClick={() => show()}>{translate("buttons.create")}</CreateButton>}
    >
      <Table {...tableProps} rowKey="id">
        <Table.Column title={translate("common.name")} dataIndex="name" />
        <Table.Column title={translate("common.email")} dataIndex="email" />
        <Table.Column<UserRow>
          title={translate("common.active")}
          dataIndex="isActive"
          render={(isActive: boolean, record) => (
            <Switch
              checked={isActive}
              checkedChildren={translate("common.active")}
              unCheckedChildren={translate("common.inactive")}
              onChange={() => toggleActive(record)}
            />
          )}
        />
        <Table.Column<UserRow>
          title={translate("users.created")}
          dataIndex="createdAt"
          render={(value: string) => new Date(value).toLocaleDateString(DATE_LOCALE)}
        />
        <Table.Column<UserRow>
          title={translate("common.actions")}
          width={200}
          render={(_, record) => (
            <Space>
              <Button size="small" icon={<KeyOutlined />} onClick={() => setResetTarget(record)}>
                {translate("users.resetPassword")}
              </Button>
              <DeleteButton size="small" hideText recordItemId={record.id} resource="users" />
            </Space>
          )}
        />
      </Table>

      {isClient ? (
        <>
      <Modal {...modalProps} forceRender title={translate("users.create")}>
        <Form {...formProps} layout="vertical">
          <Form.Item label={translate("common.name")} name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label={translate("common.email")} name="email" rules={[{ required: true, type: "email" }]}>
            <Input />
          </Form.Item>
          <Form.Item label={translate("common.password")} name="password" rules={[{ required: true, min: 8 }]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        forceRender
        title={translate("users.resetPasswordTitle", { name: resetTarget?.name ?? "" })}
        open={resetTarget !== null}
        onCancel={() => setResetTarget(null)}
        onOk={submitReset}
        confirmLoading={resetting}
      >
        <Form form={resetForm} layout="vertical">
          <Form.Item label={translate("users.newPassword")} name="password" rules={[{ required: true, min: 8 }]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
        </>
      ) : null}
    </List>
  );
}
