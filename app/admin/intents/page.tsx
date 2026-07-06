"use client";

import { useState } from "react";
import { CreateButton, DeleteButton, EditButton, List, useModalForm, useSelect, useTable } from "@refinedev/antd";
import { useInvalidate } from "@refinedev/core";
import {
  App,
  Button,
  Dropdown,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Upload,
} from "antd";
import type { UploadProps } from "antd";
import {
  DownOutlined,
  LinkOutlined,
  MessageOutlined,
  TagsOutlined,
  UploadOutlined,
} from "@ant-design/icons";

type IntentRow = {
  id: number;
  categoryId: number;
  categoryName: string;
  intentKey: string;
  title: string;
  response: string;
  isActive: boolean;
  priority: number;
  phrasesCount: number;
  keywordsCount: number;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message ?? "Request failed");
  return res.json();
}

async function apiSend(url: string, method: string, body: unknown): Promise<unknown> {
  const isFormData = body instanceof FormData;
  const res = await fetch(url, {
    method,
    headers: isFormData ? undefined : { "Content-Type": "application/json" },
    body: isFormData ? body : JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message ?? "Request failed");
  return res.json();
}

export default function IntentsPage() {
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  const refreshList = () => invalidate({ resource: "intents", invalidates: ["list"] });

  const { tableProps } = useTable<IntentRow>({
    resource: "intents",
    sorters: { initial: [{ field: "createdAt", order: "desc" }] },
  });

  const { selectProps: categorySelectProps } = useSelect({
    resource: "categories",
    optionLabel: "name",
    optionValue: "id",
  });

  const { selectProps: intentSelectProps } = useSelect({
    resource: "intents",
    optionLabel: "title",
    optionValue: "id",
    pagination: { pageSize: 500 },
  });

  const { formProps, modalProps, show } = useModalForm<IntentRow>({
    resource: "intents",
    action: "create",
    onMutationSuccess: refreshList,
  });

  const { formProps: editFormProps, modalProps: editModalProps, show: showEdit } = useModalForm<IntentRow>({
    resource: "intents",
    action: "edit",
    onMutationSuccess: refreshList,
  });

  // Phrases modal
  const [phrasesIntentId, setPhrasesIntentId] = useState<number | null>(null);
  const [phrasesForm] = Form.useForm();

  const openPhrases = async (record: IntentRow) => {
    const detail = await apiGet<{ phrases: { phrase: string }[] }>(`/api/admin/intents/${record.id}`);
    phrasesForm.setFieldsValue({ phrases: detail.phrases.map((p) => ({ phrase: p.phrase })) });
    setPhrasesIntentId(record.id);
  };

  const savePhrases = async () => {
    const values = await phrasesForm.validateFields();
    await apiSend(`/api/admin/intents/${phrasesIntentId}/phrases`, "PUT", {
      phrases: (values.phrases ?? []).map((p: { phrase: string }) => p.phrase),
    });
    message.success("Phrases updated.");
    setPhrasesIntentId(null);
    refreshList();
  };

  // Keywords modal
  const [keywordsIntentId, setKeywordsIntentId] = useState<number | null>(null);
  const [keywordsForm] = Form.useForm();

  const openKeywords = async (record: IntentRow) => {
    const detail = await apiGet<{ keywords: { keyword: string; weight: number }[] }>(
      `/api/admin/intents/${record.id}`,
    );
    keywordsForm.setFieldsValue({ keywords: detail.keywords });
    setKeywordsIntentId(record.id);
  };

  const saveKeywords = async () => {
    const values = await keywordsForm.validateFields();
    await apiSend(`/api/admin/intents/${keywordsIntentId}/keywords`, "PUT", { keywords: values.keywords ?? [] });
    message.success("Keywords updated.");
    setKeywordsIntentId(null);
    refreshList();
  };

  // Follow-ups modal
  const [followUpsIntentId, setFollowUpsIntentId] = useState<number | null>(null);
  const [followUpsForm] = Form.useForm();

  const openFollowUps = async (record: IntentRow) => {
    const detail = await apiGet<{ followUpIntentIds: number[] }>(`/api/admin/intents/${record.id}`);
    followUpsForm.setFieldsValue({ followUpIntentIds: detail.followUpIntentIds });
    setFollowUpsIntentId(record.id);
  };

  const saveFollowUps = async () => {
    const values = await followUpsForm.validateFields();
    await apiSend(`/api/admin/intents/${followUpsIntentId}/follow-ups`, "PUT", {
      followUpIntentIds: values.followUpIntentIds ?? [],
    });
    message.success("Follow-up intents updated.");
    setFollowUpsIntentId(null);
    refreshList();
  };

  // Import modals (per-intent phrases/keywords, and bulk)
  const [importTarget, setImportTarget] = useState<{ intentId: number; type: "phrases" | "keywords" } | null>(
    null,
  );
  const [importFile, setImportFile] = useState<File | null>(null);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [bulkImportFile, setBulkImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const uploadProps: UploadProps = {
    beforeUpload: (file) => {
      setImportFile(file);
      return false;
    },
    maxCount: 1,
    accept: ".xlsx",
  };

  const bulkUploadProps: UploadProps = {
    beforeUpload: (file) => {
      setBulkImportFile(file);
      return false;
    },
    maxCount: 1,
    accept: ".xlsx",
  };

  const runImport = async () => {
    if (!importTarget || !importFile) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      const result = await apiSend(
        `/api/admin/intents/${importTarget.intentId}/import-${importTarget.type}`,
        "POST",
        formData,
      );
      message.success(`${(result as { imported: number }).imported} ${importTarget.type} imported.`);
      setImportTarget(null);
      setImportFile(null);
      refreshList();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  };

  const runBulkImport = async () => {
    if (!bulkImportFile) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", bulkImportFile);
      const result = await apiSend("/api/admin/intents/import", "POST", formData);
      const { imported, failed } = result as { imported: number; failed: number; errors: string[] };
      message.success(`Import complete: ${imported} imported, ${failed} failed.`);
      setBulkImportOpen(false);
      setBulkImportFile(null);
      refreshList();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <List
      title="Intents"
      headerButtons={
        <Space>
          <Button icon={<UploadOutlined />} onClick={() => setBulkImportOpen(true)}>
            Import from Excel
          </Button>
          <CreateButton onClick={() => show()}>Create</CreateButton>
        </Space>
      }
    >
      <Table {...tableProps} rowKey="id">
        <Table.Column title="Category" dataIndex="categoryName" />
        <Table.Column title="Intent Key" dataIndex="intentKey" />
        <Table.Column title="Title" dataIndex="title" />
        <Table.Column title="Phrases" dataIndex="phrasesCount" width={90} />
        <Table.Column title="Keywords" dataIndex="keywordsCount" width={90} />
        <Table.Column<IntentRow>
          title="Active"
          dataIndex="isActive"
          render={(isActive: boolean) => <Tag color={isActive ? "green" : "red"}>{isActive ? "Active" : "Inactive"}</Tag>}
        />
        <Table.Column<IntentRow>
          title="Actions"
          width={280}
          render={(_, record) => (
            <Space>
              <Button size="small" icon={<MessageOutlined />} onClick={() => openPhrases(record)}>
                Phrases
              </Button>
              <Button size="small" icon={<TagsOutlined />} onClick={() => openKeywords(record)}>
                Keywords
              </Button>
              <Button size="small" icon={<LinkOutlined />} onClick={() => openFollowUps(record)}>
                Follow-ups
              </Button>
              <Dropdown
                menu={{
                  items: [
                    { key: "phrases", label: "Import Phrases" },
                    { key: "keywords", label: "Import Keywords" },
                  ],
                  onClick: ({ key }) => setImportTarget({ intentId: record.id, type: key as "phrases" | "keywords" }),
                }}
              >
                <Button size="small">
                  Import <DownOutlined />
                </Button>
              </Dropdown>
              <EditButton size="small" hideText recordItemId={record.id} onClick={() => showEdit(record.id)} />
              <DeleteButton size="small" hideText recordItemId={record.id} resource="intents" />
            </Space>
          )}
        />
      </Table>

      {/* Create modal */}
      <Modal {...modalProps} forceRender title="Create Intent" width={640}>
        <Form
          {...formProps}
          layout="vertical"
          onValuesChange={(changed: { title?: string }) => {
            if (changed.title) {
              formProps.form?.setFieldsValue({ intentKey: slugify(changed.title) });
            }
          }}
        >
          <Form.Item label="Category" name="categoryId" rules={[{ required: true }]}>
            <Select {...categorySelectProps} />
          </Form.Item>
          <Form.Item label="Title" name="title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Intent Key" name="intentKey" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Response" name="response" rules={[{ required: true }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item label="Active" name="isActive" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit modal */}
      <Modal {...editModalProps} forceRender title="Edit Intent" width={640}>
        <Form {...editFormProps} layout="vertical">
          <Form.Item label="Category" name="categoryId" rules={[{ required: true }]}>
            <Select {...categorySelectProps} />
          </Form.Item>
          <Form.Item label="Title" name="title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Intent Key" name="intentKey" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Response" name="response" rules={[{ required: true }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item label="Active" name="isActive" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Phrases modal */}
      <Modal
        forceRender
        title="Training Phrases"
        open={phrasesIntentId !== null}
        onCancel={() => setPhrasesIntentId(null)}
        onOk={savePhrases}
        width={560}
      >
        <Form form={phrasesForm} layout="vertical">
          <Form.List name="phrases">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <Space key={field.key} style={{ display: "flex", marginBottom: 8 }} align="baseline">
                    <Form.Item {...field} name={[field.name, "phrase"]} rules={[{ required: true }]} noStyle>
                      <Input style={{ width: 420 }} placeholder="Phrase" />
                    </Form.Item>
                    <Button danger onClick={() => remove(field.name)}>
                      Remove
                    </Button>
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} block>
                  Add Phrase
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* Keywords modal */}
      <Modal
        forceRender
        title="Keywords"
        open={keywordsIntentId !== null}
        onCancel={() => setKeywordsIntentId(null)}
        onOk={saveKeywords}
        width={560}
      >
        <Form form={keywordsForm} layout="vertical">
          <Form.List name="keywords">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <Space key={field.key} style={{ display: "flex", marginBottom: 8 }} align="baseline">
                    <Form.Item {...field} name={[field.name, "keyword"]} rules={[{ required: true }]} noStyle>
                      <Input style={{ width: 280 }} placeholder="Keyword" />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, "weight"]}
                      rules={[{ required: true }]}
                      initialValue={1}
                      noStyle
                    >
                      <Input type="number" style={{ width: 100 }} placeholder="Weight" />
                    </Form.Item>
                    <Button danger onClick={() => remove(field.name)}>
                      Remove
                    </Button>
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add({ weight: 1 })} block>
                  Add Keyword
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* Follow-ups modal */}
      <Modal
        forceRender
        title="Follow-up Intents"
        open={followUpsIntentId !== null}
        onCancel={() => setFollowUpsIntentId(null)}
        onOk={saveFollowUps}
        width={560}
      >
        <Form form={followUpsForm} layout="vertical">
          <Form.Item label="Follow-up Intents" name="followUpIntentIds">
            <Select
              {...intentSelectProps}
              mode="multiple"
              options={(intentSelectProps.options ?? []).filter(
                (option) => option.value !== followUpsIntentId,
              )}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Per-intent phrase/keyword excel import */}
      <Modal
        title={importTarget?.type === "keywords" ? "Import Keywords from Excel" : "Import Phrases from Excel"}
        open={importTarget !== null}
        onCancel={() => {
          setImportTarget(null);
          setImportFile(null);
        }}
        onOk={runImport}
        confirmLoading={importing}
      >
        <p>
          Expected {importTarget?.type === "keywords" ? "columns: Keyword | Weight" : "column: Phrase"} (first row is
          header and will be skipped).
        </p>
        <Upload {...uploadProps}>
          <Button icon={<UploadOutlined />}>Select Excel File (.xlsx)</Button>
        </Upload>
      </Modal>

      {/* Bulk intent import */}
      <Modal
        title="Import Intents from Excel"
        open={bulkImportOpen}
        onCancel={() => {
          setBulkImportOpen(false);
          setBulkImportFile(null);
        }}
        onOk={runBulkImport}
        confirmLoading={importing}
      >
        <p>
          Expected columns: Category ID | Question | Response (first row treated as header and skipped). Phrases and
          keywords are auto-generated with Gemini for each imported row.
        </p>
        <Upload {...bulkUploadProps}>
          <Button icon={<UploadOutlined />}>Select Excel File (.xlsx)</Button>
        </Upload>
      </Modal>
    </List>
  );
}
