"use client";

import { useState } from "react";
import { CreateButton, DeleteButton, EditButton, List, useModalForm, useSelect, useTable } from "@refinedev/antd";
import { useInvalidate, useTranslate } from "@refinedev/core";
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

import { useIsClient } from "@/lib/hooks/useIsClient";

export default function IntentsPage() {
  const translate = useTranslate();
  const isClient = useIsClient();
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  const refreshList = () => invalidate({ resource: "intents", invalidates: ["list"] });

  const apiGet = async <T,>(url: string): Promise<T> => {
    const res = await fetch(url);
    if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message ?? translate("common.requestFailed"));
    return res.json();
  };

  const apiSend = async (url: string, method: string, body: unknown): Promise<unknown> => {
    const isFormData = body instanceof FormData;
    const res = await fetch(url, {
      method,
      headers: isFormData ? undefined : { "Content-Type": "application/json" },
      body: isFormData ? body : JSON.stringify(body),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message ?? translate("common.requestFailed"));
    return res.json();
  };

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
    message.success(translate("intents.phrasesUpdated"));
    setPhrasesIntentId(null);
    refreshList();
  };

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
    message.success(translate("intents.keywordsUpdated"));
    setKeywordsIntentId(null);
    refreshList();
  };

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
    message.success(translate("intents.followUpsUpdated"));
    setFollowUpsIntentId(null);
    refreshList();
  };

  const [importTarget, setImportTarget] = useState<{ intentId: number; type: "phrases" | "keywords" } | null>(null);
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
      message.success(
        translate("intents.imported", {
          count: (result as { imported: number }).imported,
          type: translate(`intents.type.${importTarget.type}`),
        }),
      );
      setImportTarget(null);
      setImportFile(null);
      refreshList();
    } catch (error) {
      message.error(error instanceof Error ? error.message : translate("intents.importFailed"));
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
      message.success(translate("intents.importComplete", { imported, failed }));
      setBulkImportOpen(false);
      setBulkImportFile(null);
      refreshList();
    } catch (error) {
      message.error(error instanceof Error ? error.message : translate("intents.importFailed"));
    } finally {
      setImporting(false);
    }
  };

  return (
    <List
      title={translate("intents.title")}
      headerButtons={
        <Space>
          <Button icon={<UploadOutlined />} onClick={() => setBulkImportOpen(true)}>
            {translate("intents.importExcel")}
          </Button>
          <CreateButton onClick={() => show()}>{translate("buttons.create")}</CreateButton>
        </Space>
      }
    >
      <Table {...tableProps} rowKey="id">
        <Table.Column title={translate("common.category")} dataIndex="categoryName" />
        <Table.Column title={translate("intents.intentKey")} dataIndex="intentKey" />
        <Table.Column title={translate("common.title")} dataIndex="title" />
        <Table.Column title={translate("intents.phrases")} dataIndex="phrasesCount" width={90} />
        <Table.Column title={translate("intents.keywords")} dataIndex="keywordsCount" width={90} />
        <Table.Column<IntentRow>
          title={translate("common.active")}
          dataIndex="isActive"
          render={(isActive: boolean) => (
            <Tag color={isActive ? "green" : "red"}>
              {isActive ? translate("common.active") : translate("common.inactive")}
            </Tag>
          )}
        />
        <Table.Column<IntentRow>
          title={translate("common.actions")}
          width={280}
          render={(_, record) => (
            <Space>
              <Button size="small" icon={<MessageOutlined />} onClick={() => openPhrases(record)}>
                {translate("intents.phrases")}
              </Button>
              <Button size="small" icon={<TagsOutlined />} onClick={() => openKeywords(record)}>
                {translate("intents.keywords")}
              </Button>
              <Button size="small" icon={<LinkOutlined />} onClick={() => openFollowUps(record)}>
                {translate("intents.followUps")}
              </Button>
              <Dropdown
                menu={{
                  items: [
                    { key: "phrases", label: translate("intents.importPhrases") },
                    { key: "keywords", label: translate("intents.importKeywords") },
                  ],
                  onClick: ({ key }) => setImportTarget({ intentId: record.id, type: key as "phrases" | "keywords" }),
                }}
              >
                <Button size="small">
                  {translate("intents.import")} <DownOutlined />
                </Button>
              </Dropdown>
              <EditButton size="small" hideText recordItemId={record.id} onClick={() => showEdit(record.id)} />
              <DeleteButton size="small" hideText recordItemId={record.id} resource="intents" />
            </Space>
          )}
        />
      </Table>

      {isClient ? (
        <>
      <Modal {...modalProps} forceRender title={translate("intents.create")} width={640}>
        <Form
          {...formProps}
          layout="vertical"
          onValuesChange={(changed: { title?: string }) => {
            if (changed.title) {
              formProps.form?.setFieldsValue({ intentKey: slugify(changed.title) });
            }
          }}
        >
          <Form.Item label={translate("common.category")} name="categoryId" rules={[{ required: true }]}>
            <Select {...categorySelectProps} />
          </Form.Item>
          <Form.Item label={translate("common.title")} name="title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label={translate("intents.intentKey")} name="intentKey" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label={translate("intents.response")} name="response" rules={[{ required: true }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item label={translate("common.active")} name="isActive" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal {...editModalProps} forceRender title={translate("intents.edit")} width={640}>
        <Form {...editFormProps} layout="vertical">
          <Form.Item label={translate("common.category")} name="categoryId" rules={[{ required: true }]}>
            <Select {...categorySelectProps} />
          </Form.Item>
          <Form.Item label={translate("common.title")} name="title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label={translate("intents.intentKey")} name="intentKey" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label={translate("intents.response")} name="response" rules={[{ required: true }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item label={translate("common.active")} name="isActive" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        forceRender
        title={translate("intents.trainingPhrases")}
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
                      <Input style={{ width: 420 }} placeholder={translate("intents.phrasePlaceholder")} />
                    </Form.Item>
                    <Button danger onClick={() => remove(field.name)}>
                      {translate("common.remove")}
                    </Button>
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} block>
                  {translate("intents.addPhrase")}
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      <Modal
        forceRender
        title={translate("intents.keywords")}
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
                      <Input style={{ width: 280 }} placeholder={translate("intents.keywordPlaceholder")} />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, "weight"]}
                      rules={[{ required: true }]}
                      initialValue={1}
                      noStyle
                    >
                      <Input type="number" style={{ width: 100 }} placeholder={translate("intents.weightPlaceholder")} />
                    </Form.Item>
                    <Button danger onClick={() => remove(field.name)}>
                      {translate("common.remove")}
                    </Button>
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add({ weight: 1 })} block>
                  {translate("intents.addKeyword")}
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      <Modal
        forceRender
        title={translate("intents.followUpIntents")}
        open={followUpsIntentId !== null}
        onCancel={() => setFollowUpsIntentId(null)}
        onOk={saveFollowUps}
        width={560}
      >
        <Form form={followUpsForm} layout="vertical">
          <Form.Item label={translate("intents.followUpIntents")} name="followUpIntentIds">
            <Select
              {...intentSelectProps}
              mode="multiple"
              options={(intentSelectProps.options ?? []).filter((option) => option.value !== followUpsIntentId)}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          importTarget?.type === "keywords"
            ? translate("intents.importKeywordsExcel")
            : translate("intents.importPhrasesExcel")
        }
        open={importTarget !== null}
        onCancel={() => {
          setImportTarget(null);
          setImportFile(null);
        }}
        onOk={runImport}
        confirmLoading={importing}
      >
        <p>
          {importTarget?.type === "keywords"
            ? translate("intents.importKeywordsHint")
            : translate("intents.importPhrasesHint")}
        </p>
        <Upload {...uploadProps}>
          <Button icon={<UploadOutlined />}>{translate("intents.selectExcel")}</Button>
        </Upload>
      </Modal>

      <Modal
        title={translate("intents.importIntentsExcel")}
        open={bulkImportOpen}
        onCancel={() => {
          setBulkImportOpen(false);
          setBulkImportFile(null);
        }}
        onOk={runBulkImport}
        confirmLoading={importing}
      >
        <p>{translate("intents.importBulkHint")}</p>
        <Upload {...bulkUploadProps}>
          <Button icon={<UploadOutlined />}>{translate("intents.selectExcel")}</Button>
        </Upload>
      </Modal>
        </>
      ) : null}
    </List>
  );
}
