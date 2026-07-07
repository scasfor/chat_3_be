"use client";

import { useMemo } from "react";
import { Refine } from "@refinedev/core";
import routerProvider from "@refinedev/nextjs-router";
import { ThemedLayout, useNotificationProvider } from "@refinedev/antd";
import { ConfigProvider, App as AntdApp } from "antd";
import esES from "antd/locale/es_ES";
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
import { i18nProvider, t } from "@/lib/i18n";
import { AdminSider } from "./components/AdminSider";

function Chrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return <ThemedLayout Sider={AdminSider}>{children}</ThemedLayout>;
}

function RefineApp({ children }: { children: React.ReactNode }) {
  const notificationProvider = useNotificationProvider();

  const resources = useMemo(
    () => [
      {
        name: "dashboard",
        list: "/admin",
        meta: { label: t("nav.dashboard"), icon: <DashboardOutlined /> },
      },
      {
        name: "categories",
        list: "/admin/categories",
        meta: { label: t("nav.categories"), icon: <AppstoreOutlined /> },
      },
      {
        name: "intents",
        list: "/admin/intents",
        meta: { label: t("nav.intents"), icon: <BulbOutlined /> },
      },
      {
        name: "unmatched-questions",
        list: "/admin/unmatched-questions",
        meta: { label: t("nav.unmatchedQuestions"), icon: <QuestionCircleOutlined /> },
      },
      {
        name: "synonyms",
        list: "/admin/synonyms",
        meta: { label: t("nav.synonyms"), icon: <TagsOutlined /> },
      },
      {
        name: "conversations",
        list: "/admin/conversations",
        meta: { label: t("nav.conversations"), icon: <MessageOutlined /> },
      },
      {
        name: "users",
        list: "/admin/users",
        meta: { label: t("nav.users"), icon: <TeamOutlined /> },
      },
      {
        name: "settings",
        list: "/admin/settings",
        meta: { label: t("nav.settings"), icon: <SettingOutlined /> },
      },
    ],
    [],
  );

  return (
    <Refine
      routerProvider={routerProvider}
      dataProvider={dataProvider}
      authProvider={authProvider}
      notificationProvider={notificationProvider}
      i18nProvider={i18nProvider}
      resources={resources}
      options={{
        syncWithLocation: true,
        warnWhenUnsavedChanges: true,
        disableTelemetry: true,
        title: { text: t("app.title") },
      }}
    >
      <Chrome>{children}</Chrome>
    </Refine>
  );
}

export function AdminProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider basePath="/api/auth">
      <ConfigProvider locale={esES} theme={{ token: { colorPrimary: "#f59e0b", borderRadius: 6 } }}>
        <AntdApp>
          <RefineApp>{children}</RefineApp>
        </AntdApp>
      </ConfigProvider>
    </SessionProvider>
  );
}
