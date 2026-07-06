"use client";

import { useState } from "react";
import { DeleteButton, List, useSelect, useTable } from "@refinedev/antd";
import { useInvalidate } from "@refinedev/core";
import { App, Badge, Button, Form, Modal, Select, Space, Table, Typography } from "antd";
import { LinkOutlined } from "@ant-design/icons";

type UnmatchedQuestionRow = {
  id: number;
  question: string;
  createdAt: string;
};

export default function UnmatchedQuestionsPage() {
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  const refresh = () => invalidate({ resource: "unmatched-questions", invalidates: ["list"] });

  const { tableProps } = useTable<UnmatchedQuestionRow>({
    resource: "unmatched-questions",
    sorters: { initial: [{ field: "createdAt", order: "desc" }] },
  });

  const { selectProps: intentSelectProps } = useSelect({
    resource: "intents",
    optionLabel: "title",
    optionValue: "id",
    pagination: { pageSize: 500 },
  });

  const [matchTarget, setMatchTarget] = useState<UnmatchedQuestionRow | null>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const total = tableProps.pagination && typeof tableProps.pagination === "object" ? tableProps.pagination.total : 0;

  const submitMatch = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/unmatched-questions/${matchTarget?.id}/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intentId: values.intentId }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message ?? "Request failed");
      const body = await res.json();
      message.success(`Matched: phrase added to "${body.intentTitle}".`);
      setMatchTarget(null);
      form.resetFields();
      refresh();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Failed to match question.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <List
      title={
        <Space>
          Unmatched Questions
          {typeof total === "number" && total > 0 ? <Badge count={total} /> : null}
        </Space>
      }
    >
      <Table {...tableProps} rowKey="id">
        <Table.Column title="Question" dataIndex="question" />
        <Table.Column<UnmatchedQuestionRow>
          title="Reported At"
          dataIndex="createdAt"
          render={(value: string) => new Date(value).toLocaleString()}
        />
        <Table.Column<UnmatchedQuestionRow>
          title="Actions"
          width={220}
          render={(_, record) => (
            <Space>
              <Button size="small" icon={<LinkOutlined />} onClick={() => setMatchTarget(record)}>
                Match to Intent
              </Button>
              <DeleteButton size="small" hideText recordItemId={record.id} resource="unmatched-questions" />
            </Space>
          )}
        />
      </Table>

      <Modal
        forceRender
        title="Match to Existing Intent"
        open={matchTarget !== null}
        onCancel={() => setMatchTarget(null)}
        onOk={submitMatch}
        confirmLoading={submitting}
      >
        <Typography.Paragraph>
          <strong>Question:</strong> {matchTarget?.question}
        </Typography.Paragraph>
        <Form form={form} layout="vertical">
          <Form.Item label="Intent" name="intentId" rules={[{ required: true }]}>
            <Select {...intentSelectProps} showSearch />
          </Form.Item>
        </Form>
      </Modal>
    </List>
  );
}
