"use client";

import { CreateButton, DeleteButton, EditButton, List, useModalForm, useTable } from "@refinedev/antd";
import { useInvalidate } from "@refinedev/core";
import { Form, Input, Modal, Space, Table } from "antd";

type SynonymRow = { id: number; word: string; synonym: string };

export default function SynonymsPage() {
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
    <List title="Synonyms" headerButtons={<CreateButton onClick={() => show()}>Create</CreateButton>}>
      <p style={{ color: "#888", marginBottom: 16 }}>
        When a user&apos;s message contains a word in the &quot;Synonym&quot; column, it is expanded to also match
        the canonical &quot;Word&quot; for keyword scoring purposes.
      </p>
      <Table {...tableProps} rowKey="id">
        <Table.Column title="Word" dataIndex="word" />
        <Table.Column title="Synonym" dataIndex="synonym" />
        <Table.Column<SynonymRow>
          title="Actions"
          width={140}
          render={(_, record) => (
            <Space>
              <EditButton size="small" hideText recordItemId={record.id} onClick={() => showEdit(record.id)} />
              <DeleteButton size="small" hideText recordItemId={record.id} resource="synonyms" />
            </Space>
          )}
        />
      </Table>

      <Modal {...modalProps} forceRender title="Create Synonym">
        <Form {...formProps} layout="vertical">
          <Form.Item label="Word" name="word" rules={[{ required: true }]}>
            <Input placeholder="e.g. password" />
          </Form.Item>
          <Form.Item label="Synonym" name="synonym" rules={[{ required: true }]}>
            <Input placeholder="e.g. contraseña" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal {...editModalProps} forceRender title="Edit Synonym">
        <Form {...editFormProps} layout="vertical">
          <Form.Item label="Word" name="word" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Synonym" name="synonym" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </List>
  );
}
