"use client";

import { CreateButton, DeleteButton, EditButton, List, useModalForm, useTable } from "@refinedev/antd";
import { useInvalidate, useTranslate } from "@refinedev/core";
import { Form, Input, Modal, Space, Table } from "antd";

type SynonymRow = { id: number; word: string; synonym: string };

import { useIsClient } from "@/lib/hooks/useIsClient";

export default function SynonymsPage() {
  const translate = useTranslate();
  const isClient = useIsClient();
  const invalidate = useInvalidate();
  const refresh = () => invalidate({ resource: "synonyms", invalidates: ["list"] });

  const { tableProps } = useTable<SynonymRow>({
    resource: "synonyms",
    sorters: { initial: [{ field: "word", order: "asc" }] },
  });

  const { formProps, modalProps, show } = useModalForm<SynonymRow>({
    resource: "synonyms",
    action: "create",
    onMutationSuccess: refresh,
  });

  const { formProps: editFormProps, modalProps: editModalProps, show: showEdit } = useModalForm<SynonymRow>({
    resource: "synonyms",
    action: "edit",
    onMutationSuccess: refresh,
  });

  return (
    <List
      title={translate("synonyms.title")}
      headerButtons={<CreateButton onClick={() => show()}>{translate("buttons.create")}</CreateButton>}
    >
      <p style={{ color: "#888", marginBottom: 16 }}>{translate("synonyms.help")}</p>
      <Table {...tableProps} rowKey="id">
        <Table.Column title={translate("synonyms.word")} dataIndex="word" />
        <Table.Column title={translate("synonyms.synonym")} dataIndex="synonym" />
        <Table.Column<SynonymRow>
          title={translate("common.actions")}
          width={140}
          render={(_, record) => (
            <Space>
              <EditButton size="small" hideText recordItemId={record.id} onClick={() => showEdit(record.id)} />
              <DeleteButton size="small" hideText recordItemId={record.id} resource="synonyms" />
            </Space>
          )}
        />
      </Table>

      {isClient ? (
        <>
      <Modal {...modalProps} forceRender title={translate("synonyms.create")}>
        <Form {...formProps} layout="vertical">
          <Form.Item label={translate("synonyms.word")} name="word" rules={[{ required: true }]}>
            <Input placeholder={translate("synonyms.wordPlaceholder")} />
          </Form.Item>
          <Form.Item label={translate("synonyms.synonym")} name="synonym" rules={[{ required: true }]}>
            <Input placeholder={translate("synonyms.synonymPlaceholder")} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal {...editModalProps} forceRender title={translate("synonyms.edit")}>
        <Form {...editFormProps} layout="vertical">
          <Form.Item label={translate("synonyms.word")} name="word" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label={translate("synonyms.synonym")} name="synonym" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
        </>
      ) : null}
    </List>
  );
}
