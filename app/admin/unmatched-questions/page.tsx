"use client";

import { useState } from "react";
import { DeleteButton, List, useSelect, useTable } from "@refinedev/antd";
import { useInvalidate, useTranslate } from "@refinedev/core";
import { App, Badge, Button, Form, Modal, Select, Space, Table, Typography } from "antd";
import { LinkOutlined } from "@ant-design/icons";
import { DATE_LOCALE } from "@/lib/i18n";
import { useIsClient } from "@/lib/hooks/useIsClient";

type UnmatchedQuestionRow = {
  id: number;
  question: string;
  createdAt: string;
};

export default function UnmatchedQuestionsPage() {
  const translate = useTranslate();
  const isClient = useIsClient();
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
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message ?? translate("common.requestFailed"));
      const body = await res.json();
      message.success(translate("unmatched.matchedSuccess", { intentTitle: body.intentTitle }));
      setMatchTarget(null);
      form.resetFields();
      refresh();
    } catch (error) {
      message.error(error instanceof Error ? error.message : translate("unmatched.matchFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <List
      title={
        <Space>
          {translate("unmatched.title")}
          {typeof total === "number" && total > 0 ? <Badge count={total} /> : null}
        </Space>
      }
    >
      <Table {...tableProps} rowKey="id">
        <Table.Column title={translate("common.question")} dataIndex="question" />
        <Table.Column<UnmatchedQuestionRow>
          title={translate("unmatched.reportedAt")}
          dataIndex="createdAt"
          render={(value: string) => new Date(value).toLocaleString(DATE_LOCALE)}
        />
        <Table.Column<UnmatchedQuestionRow>
          title={translate("common.actions")}
          width={220}
          render={(_, record) => (
            <Space>
              <Button size="small" icon={<LinkOutlined />} onClick={() => setMatchTarget(record)}>
                {translate("unmatched.matchToIntent")}
              </Button>
              <DeleteButton size="small" hideText recordItemId={record.id} resource="unmatched-questions" />
            </Space>
          )}
        />
      </Table>

      {isClient ? (
      <Modal
        forceRender
        title={translate("unmatched.matchModalTitle")}
        open={matchTarget !== null}
        onCancel={() => setMatchTarget(null)}
        onOk={submitMatch}
        confirmLoading={submitting}
      >
        <Typography.Paragraph>
          <strong>{translate("common.question")}:</strong> {matchTarget?.question}
        </Typography.Paragraph>
        <Form form={form} layout="vertical">
          <Form.Item label={translate("common.intent")} name="intentId" rules={[{ required: true }]}>
            <Select {...intentSelectProps} showSearch />
          </Form.Item>
        </Form>
      </Modal>
      ) : null}
    </List>
  );
}
