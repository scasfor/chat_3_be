"use client";

import { useCallback, useContext, useMemo } from "react";
import {
  Layout,
  Menu,
  Grid,
  Drawer,
  Button,
  theme,
  ConfigProvider,
} from "antd";
import type { MenuProps } from "antd";
import {
  LogoutOutlined,
  UnorderedListOutlined,
  BarsOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import {
  type TreeMenuItem,
  useTranslate,
  useLogout,
  useIsExistAuthentication,
  useMenu,
  useLink,
  useWarnAboutChange,
} from "@refinedev/core";
import { ThemedTitle, useThemedLayoutContext } from "@refinedev/antd";
import type { RefineThemedLayoutSiderProps } from "@refinedev/antd";

const drawerButtonStyles: React.CSSProperties = {
  borderTopLeftRadius: 0,
  borderBottomLeftRadius: 0,
  position: "fixed",
  top: 64,
  zIndex: 999,
};

function buildMenuItems(
  tree: TreeMenuItem[],
  Link: ReturnType<typeof useLink>,
  activeItemDisabled: boolean,
  selectedKey?: string,
  siderCollapsed?: boolean,
): NonNullable<MenuProps["items"]> {
  return tree.map((item) => {
    const label = item.label ?? item.meta?.label ?? item.name;
    const icon = item.meta?.icon;
    const route = item.list;
    const isSelected = item.key === selectedKey;
    const linkStyle: React.CSSProperties =
      activeItemDisabled && isSelected ? { pointerEvents: "none" } : {};

    if (item.children.length > 0) {
      return {
        key: item.key,
        icon: icon ?? <UnorderedListOutlined />,
        label,
        children: buildMenuItems(item.children, Link, activeItemDisabled, selectedKey, siderCollapsed),
      };
    }

    return {
      key: item.key,
      icon: icon ?? <UnorderedListOutlined />,
      label: (
        <>
          <Link to={route ?? ""} style={linkStyle}>
            {label}
          </Link>
          {!siderCollapsed && isSelected ? <div className="ant-menu-tree-arrow" /> : null}
        </>
      ),
    };
  });
}

/** Refine's default sider uses deprecated Menu children; this version uses `items`. */
export function AdminSider({
  Title: TitleFromProps,
  fixed,
  activeItemDisabled = false,
  siderItemsAreCollapsed = true,
}: RefineThemedLayoutSiderProps) {
  const { token } = theme.useToken();
  const { siderCollapsed, setSiderCollapsed, mobileSiderOpen, setMobileSiderOpen } = useThemedLayoutContext();
  const isExistAuthentication = useIsExistAuthentication();
  const direction = useContext(ConfigProvider.ConfigContext)?.direction;
  const Link = useLink();
  const { warnWhen, setWarnWhen } = useWarnAboutChange();
  const translate = useTranslate();
  const { menuItems, selectedKey, defaultOpenKeys } = useMenu();
  const breakpoint = Grid.useBreakpoint();
  const { mutate: mutateLogout } = useLogout();

  const isMobile = typeof breakpoint.lg === "undefined" ? false : !breakpoint.lg;
  const RenderToTitle = TitleFromProps ?? ThemedTitle;

  const handleLogout = useCallback(() => {
    if (warnWhen) {
      const confirm = window.confirm(translate("warnWhenUnsavedChange"));
      if (confirm) {
        setWarnWhen(false);
        mutateLogout();
      }
    } else {
      mutateLogout();
    }
  }, [warnWhen, setWarnWhen, mutateLogout, translate]);

  const defaultExpandMenuItems = siderItemsAreCollapsed ? [] : menuItems.map(({ key }) => key);

  const items = useMemo(
    () => [
      ...buildMenuItems(menuItems, Link, activeItemDisabled, selectedKey, siderCollapsed),
      ...(isExistAuthentication
        ? [
            {
              key: "logout",
              icon: <LogoutOutlined />,
              label: translate("buttons.logout"),
              onClick: handleLogout,
            },
          ]
        : []),
    ],
    [
      menuItems,
      Link,
      activeItemDisabled,
      selectedKey,
      siderCollapsed,
      isExistAuthentication,
      translate,
      handleLogout,
    ],
  );

  const renderMenu = () => (
    <Menu
      selectedKeys={selectedKey ? [selectedKey] : []}
      defaultOpenKeys={[...defaultOpenKeys, ...defaultExpandMenuItems]}
      mode="inline"
      items={items}
      style={{
        paddingTop: "8px",
        border: "none",
        overflow: "auto",
        height: "calc(100% - 72px)",
      }}
      onClick={() => setMobileSiderOpen(false)}
    />
  );

  const renderClosingIcons = () => {
    const iconProps = { style: { color: token.colorPrimary } };
    const OpenIcon = direction === "rtl" ? RightOutlined : LeftOutlined;
    const CollapsedIcon = direction === "rtl" ? LeftOutlined : RightOutlined;
    const IconComponent = siderCollapsed ? CollapsedIcon : OpenIcon;
    return <IconComponent {...iconProps} />;
  };

  if (isMobile) {
    return (
      <>
        <Drawer
          open={mobileSiderOpen}
          onClose={() => setMobileSiderOpen(false)}
          placement={direction === "rtl" ? "right" : "left"}
          closable={false}
          width={200}
          styles={{ body: { padding: 0 } }}
          maskClosable
        >
          <Layout>
            <Layout.Sider
              style={{
                height: "100vh",
                backgroundColor: token.colorBgContainer,
                borderRight: `1px solid ${token.colorBgElevated}`,
              }}
            >
              <div
                style={{
                  width: "200px",
                  padding: "0 16px",
                  display: "flex",
                  justifyContent: "flex-start",
                  alignItems: "center",
                  height: "64px",
                  backgroundColor: token.colorBgElevated,
                }}
              >
                <RenderToTitle collapsed={false} />
              </div>
              {renderMenu()}
            </Layout.Sider>
          </Layout>
        </Drawer>
        <Button
          style={drawerButtonStyles}
          size="large"
          onClick={() => setMobileSiderOpen(true)}
          icon={<BarsOutlined />}
        />
      </>
    );
  }

  const siderStyles: React.CSSProperties = {
    backgroundColor: token.colorBgContainer,
    borderRight: `1px solid ${token.colorBgElevated}`,
  };

  if (fixed) {
    siderStyles.position = "fixed";
    siderStyles.top = 0;
    siderStyles.height = "100vh";
    siderStyles.zIndex = 999;
  }

  return (
    <>
      {fixed ? (
        <div
          style={{
            width: siderCollapsed ? "80px" : "200px",
            transition: "all 0.2s",
          }}
        />
      ) : null}
      <Layout.Sider
        style={siderStyles}
        collapsible
        collapsed={siderCollapsed}
        onCollapse={(collapsed, type) => {
          if (type === "clickTrigger") {
            setSiderCollapsed(collapsed);
          }
        }}
        collapsedWidth={80}
        breakpoint="lg"
        trigger={
          <Button
            type="text"
            style={{
              borderRadius: 0,
              height: "100%",
              width: "100%",
              backgroundColor: token.colorBgElevated,
            }}
          >
            {renderClosingIcons()}
          </Button>
        }
      >
        <div
          style={{
            width: siderCollapsed ? "80px" : "200px",
            padding: siderCollapsed ? "0" : "0 16px",
            display: "flex",
            justifyContent: siderCollapsed ? "center" : "flex-start",
            alignItems: "center",
            height: "64px",
            backgroundColor: token.colorBgElevated,
            fontSize: "14px",
          }}
        >
          <RenderToTitle collapsed={siderCollapsed} />
        </div>
        {renderMenu()}
      </Layout.Sider>
    </>
  );
}
