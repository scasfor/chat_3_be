"use client";

import { DeleteButton, List, useTable } from "@refinedev/antd";
import { useTranslate } from "@refinedev/core";
import { Input, Space, Table, Tag, Typography } from "antd";
import { DATE_LOCALE } from "@/lib/i18n";

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
  const translate = useTranslate();

  const { tableProps, setFilters } = useTable<ConversationRow>({
    resource: "conversations",
    sorters: { initial: [{ field: "createdAt", order: "desc" }] },
  });

  return (
    <List title={translate("conversations.title")}>
      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder={translate("conversations.searchPlaceholder")}
          allowClear
          style={{ width: 320 }}
          onSearch={(value) =>
            setFilters([{ field: "userMessage_like", operator: "contains", value: value || undefined }])
          }
        />
      </Space>
      <Table
        {...tableProps}
        rowKey="id"
        expandable={{
          expandedRowRender: (record) => (
            <Typography.Paragraph style={{ whiteSpace: "pre-wrap", margin: 0 }}>
              <strong>{translate("conversations.botResponse")}</strong>{" "}
              {record.botResponse ?? <em>{translate("conversations.noResponse")}</em>}
            </Typography.Paragraph>
          ),
        }}
      >
        <Table.Column<ConversationRow>
          title={translate("conversations.session")}
          dataIndex="sessionId"
          width={160}
          render={(value: string) => <code style={{ fontSize: 12 }}>{value.slice(0, 8)}…</code>}
        />
        <Table.Column title={translate("conversations.message")} dataIndex="userMessage" />
        <Table.Column<ConversationRow>
          title={translate("conversations.matchedIntent")}
          dataIndex="intentTitle"
          render={(value: string | null) =>
            value ? <Tag color="blue">{value}</Tag> : <Tag color="red">{translate("common.unmatched")}</Tag>
          }
        />
        <Table.Column<ConversationRow>
          title={translate("conversations.confidence")}
          dataIndex="confidence"
          width={110}
          render={(value: string | number | null) => (value !== null ? `${Number(value).toFixed(0)}%` : "—")}
        />
        <Table.Column<ConversationRow>
          title={translate("conversations.at")}
          dataIndex="createdAt"
          width={180}
          render={(value: string) => new Date(value).toLocaleString(DATE_LOCALE)}
        />
        <Table.Column<ConversationRow>
          title={translate("common.actions")}
          width={100}
          render={(_, record) => (
            <DeleteButton size="small" hideText recordItemId={record.id} resource="conversations" />
          )}
        />
      </Table>
    </List>
  );
}
