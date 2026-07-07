"use client";

import { useState } from "react";
import { useTable, useModalForm, List, CreateButton, EditButton, DeleteButton } from "@refinedev/antd";
import { useInvalidate, useCustomMutation, useTranslate } from "@refinedev/core";
import { Table, Modal, Form, Input, Select, Space, Tag, Button, Switch } from "antd";
import { ArrowDownOutlined, ArrowUpOutlined } from "@ant-design/icons";

type CategoryRow = {
  id: number;
  name: string;
  status: number;
  sortOrder: number;
  topics: string[];
  topicsCount: number;
  intentsCount: number;
};

import { useIsClient } from "@/lib/hooks/useIsClient";

export default function CategoriesPage() {
  const translate = useTranslate();
  const isClient = useIsClient();
  const invalidate = useInvalidate();
  const { mutate: customMutate } = useCustomMutation();
  const [reordering, setReordering] = useState(false);

  const { tableProps } = useTable<CategoryRow>({
    resource: "categories",
    sorters: { initial: [{ field: "sortOrder", order: "asc" }] },
  });

  const { formProps, modalProps, show, formLoading } = useModalForm<CategoryRow>({
    resource: "categories",
    action: "create",
    onMutationSuccess: () => invalidate({ resource: "categories", invalidates: ["list"] }),
  });

  const {
    formProps: editFormProps,
    modalProps: editModalProps,
    show: showEdit,
  } = useModalForm<CategoryRow>({
    resource: "categories",
    action: "edit",
    onMutationSuccess: () => invalidate({ resource: "categories", invalidates: ["list"] }),
  });

  const statusOptions = [
    { label: translate("common.active"), value: 1 },
    { label: translate("common.inactive"), value: 0 },
  ];

  const toggleStatus = (id: number) => {
    customMutate(
      { url: `/api/admin/categories/${id}/toggle-status`, method: "post", values: {} },
      { onSuccess: () => invalidate({ resource: "categories", invalidates: ["list"] }) },
    );
  };

  const move = (record: CategoryRow, direction: "up" | "down") => {
    const rows = (tableProps.dataSource ?? []) as CategoryRow[];
    const index = rows.findIndex((row) => row.id === record.id);
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= rows.length) return;

    setReordering(true);
    const orderedIds = rows.map((row) => row.id);
    [orderedIds[index], orderedIds[swapWith]] = [orderedIds[swapWith], orderedIds[index]];

    customMutate(
      { url: "/api/admin/categories/reorder", method: "post", values: { orderedIds } },
      {
        onSuccess: () => {
          setReordering(false);
          invalidate({ resource: "categories", invalidates: ["list"] });
        },
        onError: () => setReordering(false),
      },
    );
  };

  return (
    <List
      title={translate("categories.title")}
      headerButtons={<CreateButton onClick={() => show()}>{translate("buttons.create")}</CreateButton>}
    >
      <Table {...tableProps} rowKey="id" loading={tableProps.loading || reordering} pagination={false}>
        <Table.Column<CategoryRow>
          title={translate("categories.order")}
          width={100}
          render={(_, record) => (
            <Space>
              <Button size="small" icon={<ArrowUpOutlined />} onClick={() => move(record, "up")} />
              <Button size="small" icon={<ArrowDownOutlined />} onClick={() => move(record, "down")} />
            </Space>
          )}
        />
        <Table.Column title={translate("common.name")} dataIndex="name" />
        <Table.Column<CategoryRow>
          title={translate("categories.topics")}
          dataIndex="topics"
          render={(topics: string[]) => (
            <Space wrap>
              {topics.map((topic) => (
                <Tag key={topic}>{topic}</Tag>
              ))}
            </Space>
          )}
        />
        <Table.Column title={translate("categories.intents")} dataIndex="intentsCount" />
        <Table.Column<CategoryRow>
          title={translate("common.status")}
          dataIndex="status"
          render={(status: number, record) => (
            <Switch
              checked={!!status}
              checkedChildren={translate("common.active")}
              unCheckedChildren={translate("common.inactive")}
              onChange={() => toggleStatus(record.id)}
            />
          )}
        />
        <Table.Column<CategoryRow>
          title={translate("common.actions")}
          render={(_, record) => (
            <Space>
              <EditButton size="small" hideText recordItemId={record.id} onClick={() => showEdit(record.id)} />
              <DeleteButton size="small" hideText recordItemId={record.id} resource="categories" />
            </Space>
          )}
        />
      </Table>

      {isClient ? (
        <>
      <Modal {...modalProps} forceRender title={translate("categories.create")}>
        <Form {...formProps} layout="vertical">
          <Form.Item label={translate("common.name")} name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label={translate("common.status")} name="status" initialValue={1}>
            <Select options={statusOptions} />
          </Form.Item>
          <Form.Item label={translate("categories.topics")} name="topics">
            <Select mode="tags" placeholder={translate("categories.topicsPlaceholder")} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal {...editModalProps} forceRender title={translate("categories.edit")} confirmLoading={formLoading}>
        <Form {...editFormProps} layout="vertical">
          <Form.Item label={translate("common.name")} name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label={translate("common.status")} name="status">
            <Select options={statusOptions} />
          </Form.Item>
          <Form.Item label={translate("categories.topics")} name="topics">
            <Select mode="tags" placeholder={translate("categories.topicsPlaceholder")} />
          </Form.Item>
        </Form>
      </Modal>
        </>
      ) : null}
    </List>
  );
}
