"use client";

import { DeleteButton, List, useTable } from "@refinedev/antd";
import { Input, Space, Table, Tag, Typography } from "antd";

type ConversationRow = {
  id: number;
  sessionId: string;
  userMessage: string;
  intentTitle: string | null;
  intentKey: string | null;
  confidence: string | number | null;
  botResponse: string | null;
  createdAt: string;
};

export default function ConversationsPage() {
  const { tableProps, setFilters } = useTable<ConversationRow>({
    resource: "conversations",
    sorters: { initial: [{ field: "createdAt", order: "desc" }] },
  });

  return (
    <List title="Conversation Log">
      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Search by message content"
          allowClear
          style={{ width: 320 }}
          onSearch={(value) =>
            setFilters([{ field: "userMessage_like", operator: "contains", value: value || undefined }])
          }
        />
      </Space>
      <Table {...tableProps} rowKey="id" expandable={{
        expandedRowRender: (record) => (
          <Typography.Paragraph style={{ whiteSpace: "pre-wrap", margin: 0 }}>
            <strong>Bot response:</strong> {record.botResponse ?? <em>none (fallback/clarification)</em>}
          </Typography.Paragraph>
        ),
      }}>
        <Table.Column<ConversationRow>
          title="Session"
          dataIndex="sessionId"
          width={160}
          render={(value: string) => <code style={{ fontSize: 12 }}>{value.slice(0, 8)}…</code>}
        />
        <Table.Column title="Message" dataIndex="userMessage" />
        <Table.Column<ConversationRow>
          title="Matched Intent"
          dataIndex="intentTitle"
          render={(value: string | null, record) =>
            value ? <Tag color="blue">{value}</Tag> : <Tag color="red">unmatched</Tag>
          }
        />
        <Table.Column<ConversationRow>
          title="Confidence"
          dataIndex="confidence"
          width={110}
          render={(value: string | number | null) => (value !== null ? `${Number(value).toFixed(0)}%` : "—")}
        />
        <Table.Column<ConversationRow>
          title="At"
          dataIndex="createdAt"
          width={180}
          render={(value: string) => new Date(value).toLocaleString()}
        />
        <Table.Column<ConversationRow>
          title="Actions"
          width={100}
          render={(_, record) => <DeleteButton size="small" hideText recordItemId={record.id} resource="conversations" />}
        />
      </Table>
    </List>
  );
}
