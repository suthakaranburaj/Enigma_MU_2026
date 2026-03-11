'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, CheckSquare, TrendingUp, Clock, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { AppSidebar } from "@/components/SIdebar";
import { useAuth } from "@/contexts/auth-context";
import { SERVER_URL } from "@/utils/commonHelper";

function formatDueDate(dueDate) {
  if (!dueDate) return "No due date";
  const parsed = new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) return "No due date";
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isOverdueTask(task) {
  if (task?.status === "completed") return false;
  const dueDate = parseDate(task?.due_date);
  if (!dueDate) return false;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return dueDate.getTime() < now.getTime();
}

export default function Dashboard() {
  const { token, isLoading: authLoading } = useAuth();
  const [circulars, setCirculars] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const authHeaders = useMemo(() => {
    if (!token) return {};
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }, [token]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const circularsPromise = fetch("/api/circulars").then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error || "Failed to fetch circulars");
        }
        return Array.isArray(json?.circulars) ? json.circulars : [];
      });

      const tasksPromise = token
        ? fetch(`${SERVER_URL}/api/tasks`, { headers: authHeaders }).then(async (res) => {
            const json = await res.json();
            if (!res.ok) {
              throw new Error(json?.error || "Failed to fetch tasks");
            }
            return json?.data?.tasks || [];
          })
        : Promise.resolve([]);

      const statsPromise = token
        ? fetch(`${SERVER_URL}/api/tasks/stats`, { headers: authHeaders }).then(async (res) => {
            const json = await res.json();
            if (!res.ok) {
              throw new Error(json?.error || "Failed to fetch task stats");
            }
            return json?.data || null;
          })
        : Promise.resolve(null);

      const [circularsData, tasksData, statsData] = await Promise.all([
        circularsPromise,
        tasksPromise,
        statsPromise,
      ]);

      setCirculars(circularsData);
      setTasks(tasksData);
      setStats(statsData);
    } catch (fetchError) {
      setError(fetchError.message || "Failed to load dashboard data");
      setCirculars([]);
      setTasks([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [authHeaders, token]);

  useEffect(() => {
    if (authLoading) return;
    fetchDashboardData();
  }, [authLoading, fetchDashboardData]);

  const recentCirculars = useMemo(() => circulars.slice(0, 3), [circulars]);

  const pendingTasks = useMemo(() => {
    return tasks
      .filter((task) => task.status !== "completed")
      .sort((a, b) => {
        const aDue = parseDate(a?.due_date)?.getTime() || Number.MAX_SAFE_INTEGER;
        const bDue = parseDate(b?.due_date)?.getTime() || Number.MAX_SAFE_INTEGER;
        if (aDue !== bDue) return aDue - bDue;
        return new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime();
      })
      .slice(0, 5);
  }, [tasks]);

  const statsData = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const newCirculars = circulars.filter((item) => {
      const date = parseDate(item?.date);
      return date && date.getMonth() === month && date.getFullYear() === year;
    }).length;

    const overdueCount = tasks.filter((task) => isOverdueTask(task)).length;
    const openTasks = stats ? (stats.pending || 0) + (stats.in_progress || 0) : pendingTasks.length;

    const complianceScore = stats?.total
      ? Math.round(((stats.completed || 0) / stats.total) * 100)
      : 0;

    const upcomingTasks = tasks.filter((task) => {
      if (task?.status === "completed") return false;
      const dueDate = parseDate(task?.due_date);
      if (!dueDate) return false;

      const diff = dueDate.getTime() - now.getTime();
      return diff >= 0 && diff <= 1000 * 60 * 60 * 24 * 30;
    });

    const nextDeadline = upcomingTasks
      .map((task) => parseDate(task?.due_date))
      .filter(Boolean)
      .sort((a, b) => a.getTime() - b.getTime())[0];

    return [
      { label: "New Circulars", value: String(newCirculars), sub: "This month", icon: FileText },
      { label: "Open Tasks", value: String(openTasks), sub: `${overdueCount} overdue`, icon: CheckSquare },
      {
        label: "Compliance Score",
        value: `${complianceScore}%`,
        sub: stats?.total ? `${stats.completed} of ${stats.total} completed` : "No tasks yet",
        icon: TrendingUp,
      },
      {
        label: "Upcoming Deadlines",
        value: String(upcomingTasks.length),
        sub: nextDeadline ? `Next: ${formatDueDate(nextDeadline.toISOString())}` : "No upcoming due dates",
        icon: Clock,
      },
    ];
  }, [circulars, pendingTasks.length, stats, tasks]);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <AppSidebar />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-6xl">
          {/* Header */}
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
              <p className="text-sm text-cloudy mt-1">Your compliance overview at a glance</p>
            </div>
            <button
              type="button"
              onClick={fetchDashboardData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-border-subtle px-3 py-2 text-xs text-cloudy hover:text-foreground"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Refresh
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-crail/30 bg-crail/5 px-3 py-2 text-xs text-crail">
              {error}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statsData.map((s) => (
              <div key={s.label} className="bg-background border border-border-subtle rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-cloudy uppercase tracking-wide">{s.label}</p>
                  <s.icon className="h-4 w-4 text-cloudy" />
                </div>
                <p className="text-2xl font-semibold text-crail">{s.value}</p>
                <p className="text-xs text-cloudy mt-1">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Main Content */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Recent Circulars */}
            <div className="flex-1 lg:w-[60%]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Recent RBI Rules & Updates</h2>
                <Link
                  href="/circulars"
                  className="flex items-center gap-1 text-xs text-cloudy hover:text-foreground font-medium transition-colors duration-150"
                >
                  View All <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              {loading ? (
                <div className="rounded-xl border border-border-subtle p-6 text-sm text-cloudy">Loading updates...</div>
              ) : recentCirculars.length === 0 ? (
                <div className="rounded-xl border border-border-subtle p-6 text-sm text-cloudy">No RBI updates found.</div>
              ) : (
                <div className="space-y-3">
                  {recentCirculars.map((c) => (
                    <div key={c.id} className="bg-background border border-border-subtle rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-mono text-cloudy">{c.ref}</span>
                        <span className="text-xs text-cloudy">{c.date}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-pampas text-crail font-medium border border-crail/20">
                          {c.category}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">{c.title}</h3>
                      <p className="text-sm text-cloudy mt-1 line-clamp-2">{c.summary}</p>
                      <div className="flex items-center gap-4 mt-3">
                        <Link
                          href="/circulars"
                          className="text-xs text-crail font-medium hover:text-[#A8502F] transition-colors duration-150"
                        >
                          View Details
                        </Link>
                        <span className="text-xs text-cloudy">{c.obligations || 0} obligations</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tasks */}
            <div className="lg:w-[40%]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Pending Tasks</h2>
                <Link
                  href="/tasks"
                  className="flex items-center gap-1 text-xs text-cloudy hover:text-foreground font-medium transition-colors duration-150"
                >
                  View All <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              {loading ? (
                <div className="rounded-xl border border-border-subtle p-6 text-sm text-cloudy">Loading tasks...</div>
              ) : pendingTasks.length === 0 ? (
                <div className="rounded-xl border border-border-subtle p-6 text-sm text-cloudy">No pending tasks.</div>
              ) : (
                <div className="space-y-2">
                  {pendingTasks.map((task) => {
                    const overdue = isOverdueTask(task);
                    return (
                      <div
                        key={task.id}
                        className={
                          "bg-background border border-border-subtle rounded-xl p-3 flex items-start gap-3 " +
                          (overdue ? "border-l-2 border-l-crail" : "")
                        }
                      >
                        <input type="checkbox" className="mt-1 accent-crail h-4 w-4 rounded" disabled />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{task.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs rounded-full px-2 py-0.5 bg-pampas text-cloudy">
                              {task.department || "Compliance"}
                            </span>
                            <span className={"text-xs " + (overdue ? "text-crail font-medium" : "text-cloudy")}>
                              Due {formatDueDate(task.due_date)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
