"use client";

import { Refine } from "@refinedev/core";
import routerProvider from "@refinedev/nextjs-router";
import { ThemedLayout, useNotificationProvider } from "@refinedev/antd";
import { ConfigProvider, App as AntdApp } from "antd";
import { SessionProvider } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  AppstoreOutlined,
  BulbOutlined,
  DashboardOutlined,
  MessageOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  TagsOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import "@refinedev/antd/dist/reset.css";
import { dataProvider } from "@/lib/refine/dataProvider";
import { authProvider } from "@/lib/refine/authProvider";

const resources = [
  { name: "dashboard", list: "/admin", meta: { label: "Dashboard", icon: <DashboardOutlined /> } },
  { name: "categories", list: "/admin/categories", meta: { label: "Categories", icon: <AppstoreOutlined /> } },
  { name: "intents", list: "/admin/intents", meta: { label: "Intents", icon: <BulbOutlined /> } },
  {
    name: "unmatched-questions",
    list: "/admin/unmatched-questions",
    meta: { label: "Unmatched Questions", icon: <QuestionCircleOutlined /> },
  },
  { name: "synonyms", list: "/admin/synonyms", meta: { label: "Synonyms", icon: <TagsOutlined /> } },
  {
    name: "conversations",
    list: "/admin/conversations",
    meta: { label: "Conversation Log", icon: <MessageOutlined /> },
  },
  { name: "users", list: "/admin/users", meta: { label: "Users", icon: <TeamOutlined /> } },
  { name: "settings", list: "/admin/settings", meta: { label: "Settings", icon: <SettingOutlined /> } },
];

function Chrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return <ThemedLayout>{children}</ThemedLayout>;
}

function RefineApp({ children }: { children: React.ReactNode }) {
  const notificationProvider = useNotificationProvider();

  return (
    <Refine
      routerProvider={routerProvider}
      dataProvider={dataProvider}
      authProvider={authProvider}
      notificationProvider={notificationProvider}
      resources={resources}
      options={{
        syncWithLocation: true,
        warnWhenUnsavedChanges: true,
        disableTelemetry: true,
        title: { text: "COI Bot Admin" },
      }}
    >
      <Chrome>{children}</Chrome>
    </Refine>
  );
}

export function AdminProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider basePath="/api/auth">
      <ConfigProvider theme={{ token: { colorPrimary: "#f59e0b", borderRadius: 6 } }}>
        <AntdApp>
          <RefineApp>{children}</RefineApp>
        </AntdApp>
      </ConfigProvider>
    </SessionProvider>
  );
}
