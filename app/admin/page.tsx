"use client";

import { useEffect, useState } from "react";
import { useTranslate } from "@refinedev/core";
import { Card, Col, Row, Statistic, Table, Typography } from "antd";
import {
  BulbOutlined,
  FolderOpenOutlined,
  MessageOutlined,
  QuestionCircleOutlined,
  TagOutlined,
} from "@ant-design/icons";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DATE_LOCALE } from "@/lib/i18n";

type Stats = {
  totalIntents: number;
  activeIntents: number;
  conversations: number;
  unmatchedQuestions: number;
  categories: number;
  phrases: number;
  keywords: number;
};

type ChartData = { labels: string[]; values: number[] };

type UnmatchedRow = { id: number; question: string; createdAt: string };

export default function DashboardPage() {
  const translate = useTranslate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [chart, setChart] = useState<ChartData | null>(null);
  const [unmatched, setUnmatched] = useState<UnmatchedRow[]>([]);

  useEffect(() => {
    fetch("/api/admin/dashboard/stats")
      .then((res) => res.json())
      .then(setStats);
    fetch("/api/admin/dashboard/conversations-chart")
      .then((res) => res.json())
      .then(setChart);
    fetch("/api/admin/unmatched-questions?_sort=createdAt&_order=desc&_start=0&_end=10")
      .then((res) => res.json())
      .then(setUnmatched);
  }, []);

  const chartData = chart?.labels.map((label, index) => ({ date: label, count: chart.values[index] })) ?? [];

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title={translate("dashboard.totalIntents")}
              value={stats?.totalIntents ?? 0}
              prefix={<BulbOutlined />}
              suffix={
                stats ? (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {translate("dashboard.activeCount", { count: stats.activeIntents })}
                  </Typography.Text>
                ) : null
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title={translate("dashboard.conversations")}
              value={stats?.conversations ?? 0}
              prefix={<MessageOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title={translate("dashboard.unmatchedQuestions")}
              value={stats?.unmatchedQuestions ?? 0}
              prefix={<QuestionCircleOutlined />}
              valueStyle={{ color: (stats?.unmatchedQuestions ?? 0) > 0 ? "#cf1322" : undefined }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title={translate("dashboard.categories")}
              value={stats?.categories ?? 0}
              prefix={<FolderOpenOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title={translate("dashboard.trainingPhrases")}
              value={stats?.phrases ?? 0}
              prefix={<MessageOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic title={translate("dashboard.keywords")} value={stats?.keywords ?? 0} prefix={<TagOutlined />} />
          </Card>
        </Col>
      </Row>

      <Card title={translate("dashboard.conversationsChart")} style={{ marginTop: 16 }}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={2} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title={translate("dashboard.recentUnmatched")} style={{ marginTop: 16 }}>
        <Table
          dataSource={unmatched}
          rowKey="id"
          pagination={false}
          columns={[
            { title: translate("common.question"), dataIndex: "question" },
            {
              title: translate("dashboard.askedAt"),
              dataIndex: "createdAt",
              width: 200,
              render: (value: string) => new Date(value).toLocaleString(DATE_LOCALE),
            },
          ]}
        />
      </Card>
    </div>
  );
}
