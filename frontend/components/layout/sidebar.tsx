"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SquaresFour as LayoutDashboard,
  Train as TrainTrack,
  Path as GitCommitHorizontal,
  Wrench,
  Sparkle as Sparkles,
  Calendar as CalendarRange,
  CalendarBlank as CalendarDays,
  ShieldWarning as ShieldAlert,
} from "@phosphor-icons/react/dist/ssr";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { HealthIndicator } from "@/components/layout/health-indicator";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "/",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Assets & Operations",
    items: [
      {
        title: "Trains",
        url: "/trains",
        icon: TrainTrack,
      },
      {
        title: "Sections",
        url: "/sections",
        icon: GitCommitHorizontal,
      },
      {
        title: "Maintenance Jobs",
        url: "/maintenance-jobs",
        icon: Wrench,
      },
    ],
  },
  {
    label: "Intelligence Engine",
    items: [
      {
        title: "Optimizer",
        url: "/optimizer",
        icon: Sparkles,
        badge: "CP-SAT",
      },
    ],
  },
  {
    label: "Schedules & Horizons",
    items: [
      {
        title: "Weekly Plan",
        url: "/plans/weekly",
        icon: CalendarRange,
      },
      {
        title: "Monthly Plan",
        url: "/plans/monthly",
        icon: CalendarDays,
      },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  const isItemActive = (url: string) => {
    if (url === "/") {
      return pathname === "/";
    }
    return pathname === url || pathname.startsWith(`${url}/`);
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-blue-700 text-white shadow-sm ring-1 ring-blue-800">
            <TrainTrack className="size-5" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="font-bold text-sm tracking-tight text-foreground truncate">
              RAILNET-AI
            </span>
            <span className="text-[11px] font-medium text-muted-foreground truncate">
              Block Planning · SIH26027
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label} className="py-1">
            <SidebarGroupLabel className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/80 px-2">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isItemActive(item.url);
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        render={<Link href={item.url} />}
                        isActive={active}
                        tooltip={item.title}
                        className={
                          active
                            ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="truncate">{item.title}</span>
                        {item.badge && (
                          <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase">
                            {item.badge}
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="p-3 gap-2">
        <div className="px-1">
          <HealthIndicator />
        </div>
        <div className="flex items-center gap-1.5 px-2 text-[11px] text-muted-foreground/70">
          <ShieldAlert className="size-3 shrink-0" />
          <span className="truncate">Ministry of Railways · Pilot</span>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

