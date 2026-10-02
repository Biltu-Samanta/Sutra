"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { UserRole } from "@/lib/types";
import { signOutUser, getCurrentAuthUserEmail, getAuthSession } from "@/lib/supabase";
import {
  LayoutGrid,
  Plus,
  FolderSearch,
  FileText,
  Send,
  Building2,
  LockKeyhole,
  CircleHelp,
  LogOut,
  Bell,
  ChevronDown,
  Search,
  Menu,
  X,
} from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentRole, setCurrentRole, userEmail, setUserEmail, setBadgeNumber } = useAppStore();

  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [greeting, setGreeting] = useState("Greetings!");

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(
      hour >= 5 && hour < 12
        ? "Good morning!"
        : hour < 17
        ? "Good afternoon!"
        : hour < 21
        ? "Good evening!"
        : "Good night!"
    );
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function verifySession() {
      if (userEmail) {
        if (isMounted) {
          setIsAuthenticated(true);
          setAuthChecking(false);
        }
        return;
      }

      const activeEmail = await getCurrentAuthUserEmail();
      if (!isMounted) return;

      if (activeEmail) {
        setUserEmail(activeEmail);
        const savedBadge = localStorage.getItem("sutra_badge_number");
        if (savedBadge) setBadgeNumber(savedBadge);
        const session = await getAuthSession();
        if (session?.user?.user_metadata?.role) {
          setCurrentRole(session.user.user_metadata.role as UserRole);
        } else if (typeof window !== "undefined") {
          const savedRole = localStorage.getItem("sutra_role") as UserRole | null;
          if (savedRole) setCurrentRole(savedRole);
        }
        setIsAuthenticated(true);
        setAuthChecking(false);
      } else {
        // Auto-initialize demo investigator session so user is never locked out
        setUserEmail("officer.delhi@cybercrime.gov.in");
        setCurrentRole("investigating_officer");
        setIsAuthenticated(true);
        setAuthChecking(false);
      }
    }

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [userEmail, setUserEmail, setBadgeNumber, setCurrentRole]);

  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (err) {
      console.error(err);
    }
    setUserEmail(null);
    router.replace("/login");
  };

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
    { label: "New Investigation", href: "/trace/new", icon: Plus },
    { label: "Investigations", href: "/dashboard", icon: FolderSearch },
    { label: "Legal Notices", href: "/case/33906c47-a1a2-49b3-a97c-d587e93646ef/notice", icon: FileText },
    { label: "SAHYOG Portal", href: "/sahyog", icon: Send },
    { label: "VASP Registry", href: "/vasp", icon: Building2 },
    { label: "Supervisory Audit", href: "/dashboard/audit", icon: LockKeyhole },
  ];

  const officerInitials = "AS";
  const officerName = currentRole === "supervisory_officer" ? "ACP Rajesh Verma" : "Inspector A. Sharma";
  const roleDisplay = currentRole === "supervisory_officer" ? "Supervisory Officer" : "Investigating Officer";

  if (authChecking || !isAuthenticated) {
    return (
      <div className="min-h-screen w-screen bg-[var(--background)] flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-[var(--muted-foreground)] font-mono">
          <div className="size-4 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
          <span>Verifying security session…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="app-backdrop">
      <div className="app-frame">
        {/* Top Dark Bar / Horizontal Sidebar from SUTRA UI Design */}
        <aside className={`sidebar ${mobileNavOpen ? "sidebar--open" : ""}`} aria-label="Main navigation">
          <Link href="/dashboard" className="brand-mark" title="SUTRA">
            <span className="brand-letter">S</span>
            <span className="brand-dot" />
          </Link>
          <div className="side-divider" />
          <nav className="nav-icons">
            {navItems.map((item) => {
              const active = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.label + item.href}
                  href={item.href}
                  title={item.label}
                  className={`nav-icon ${active ? "nav-icon--active" : ""}`}
                >
                  <Icon size={19} strokeWidth={1.9} />
                </Link>
              );
            })}
          </nav>
          <div className="side-bottom">
            <button
              type="button"
              className="nav-icon"
              title="SUTRA Architecture & Docs"
              onClick={() => router.push("/vasp")}
            >
              <CircleHelp size={19} />
            </button>
            <button
              type="button"
              className="nav-icon"
              title="Sign Out"
              onClick={handleSignOut}
            >
              <LogOut size={19} />
            </button>
          </div>
        </aside>

        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-intro">
            <button
              type="button"
              className="mobile-menu nav-icon md:hidden"
              aria-label="Toggle navigation"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
            >
              {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="officer-avatar">{officerInitials}</div>
            <div>
              <div className="greeting">
                {greeting} <span>✦</span>
              </div>
              <div className="subtitle">Start your day with SUTRA</div>
            </div>
          </div>

          <div className="topbar-search">
            <Search size={17} />
            <input
              aria-label="Search investigations"
              placeholder="Search investigations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && search.trim()) {
                  router.push(`/dashboard?q=${encodeURIComponent(search.trim())}`);
                }
              }}
            />
          </div>

          <div className="topbar-actions">
            <button
              type="button"
              className="header-icon nav-icon"
              aria-label="Notifications"
              title="No new alerts"
            >
              <Bell size={18} />
            </button>

            <div className="account-wrap">
              <button
                type="button"
                onClick={() => setAccountOpen(!accountOpen)}
                className="ui-button ui-button--dark account-button"
              >
                <span className="account-avatar">{officerInitials}</span>
                <span>My account</span>
                <ChevronDown size={13} />
              </button>

              {accountOpen && (
                <div className="account-popover">
                  <strong>{officerName}</strong>
                  <span>{roleDisplay}</span>
                  <div className="popover-rule" />
                  <span className="text-[10px] text-slate-400 font-mono">
                    {userEmail || "officer.delhi@cybercrime.gov.in"}
                  </span>
                  <div className="popover-rule" />
                  <div className="flex flex-col gap-1.5 pt-1">
                    <button
                      type="button"
                      className="text-left text-xs font-semibold hover:text-[var(--primary)] text-slate-700"
                      onClick={() => {
                        setCurrentRole(currentRole === "supervisory_officer" ? "investigating_officer" : "supervisory_officer");
                        setAccountOpen(false);
                      }}
                    >
                      Switch to {currentRole === "supervisory_officer" ? "Investigating Officer" : "Supervisory Officer"}
                    </button>
                    <button
                      type="button"
                      className="text-left text-xs text-red-600 hover:underline pt-1"
                      onClick={handleSignOut}
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Application Area */}
        <main className="workspace">
          <div className="page-content">{children}</div>
        </main>
      </div>
    </div>
  );
}
