"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MONTH_LABELS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export interface VolumePoint {
  month: string;
  volume: number;
  count: number;
}

export interface StatusSlice {
  name: string;
  value: number;
  color: string;
}

export interface RecentInvestorRow {
  id: string;
  name: string;
  email: string;
  amount: number;
  date: string;
}

export interface AdminAnalytics {
  volumeByMonth: VolumePoint[];
  volumeSparkline: { value: number }[];
  statusDistribution: StatusSlice[];
  pendingCount: number;
  activeCount: number;
  monthVolume: number;
  volumeChange: number;
  recentInvestors: RecentInvestorRow[];
  investorSparkline: { value: number }[];
}

function monthKey(date: Date) {
  return `${MONTH_LABELS[date.getMonth()]}/${String(date.getFullYear()).slice(2)}`;
}

export function useAdminAnalytics() {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: investments } = await supabase
        .from("investments")
        .select("id, amount, status, payment_date, created_at, user_id");

      const rows = investments || [];
      const userIds = [
        ...new Set(rows.map((r) => r.user_id).filter(Boolean) as string[]),
      ];

      const { data: profilesData } =
        userIds.length > 0
          ? await supabase
              .from("profiles")
              .select("id, full_name, email")
              .in("id", userIds)
          : { data: [] };

      const profileMap = Object.fromEntries(
        (profilesData || []).map((p) => [p.id, p]),
      );
      const now = new Date();
      const months: VolumePoint[] = [];

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = monthKey(d);
        const month = d.getMonth();
        const year = d.getFullYear();

        const inMonth = rows.filter((inv) => {
          const raw = inv.payment_date || inv.created_at;
          if (!raw) return false;
          const dt = new Date(raw);
          return dt.getMonth() === month && dt.getFullYear() === year && inv.status === "active";
        });

        months.push({
          month: key,
          volume: inMonth.reduce((s, inv) => s + Number(inv.amount || 0), 0),
          count: inMonth.length,
        });
      }

      const active = rows.filter((r) => r.status === "active");
      const pending = rows.filter((r) => r.status === "pending");

      const statusDistribution: StatusSlice[] = [
        { name: "Ativos", value: active.length, color: "#10B981" },
        { name: "Pendentes", value: pending.length, color: "#F59E0B" },
        {
          name: "Outros",
          value: rows.filter((r) => !["active", "pending"].includes(r.status)).length,
          color: "#6B7C74",
        },
      ].filter((s) => s.value > 0);

      const thisMonth = months[months.length - 1]?.volume || 0;
      const prevMonth = months[months.length - 2]?.volume || 0;
      const volumeChange =
        prevMonth > 0 ? ((thisMonth - prevMonth) / prevMonth) * 100 : 0;

      const byInvestor = new Map<string, RecentInvestorRow>();
      for (const inv of active) {
        const uid = inv.user_id as string;
        if (!uid) continue;
        const profile = profileMap[uid as string];
        const existing = byInvestor.get(uid);
        const amt = Number(inv.amount || 0);
        const date = inv.payment_date || inv.created_at || "";

        if (existing) {
          existing.amount += amt;
          if (date > existing.date) existing.date = date;
        } else {
          byInvestor.set(uid, {
            id: uid,
            name: profile?.full_name || "Investidor",
            email: profile?.email || "",
            amount: amt,
            date,
          });
        }
      }

      const recentInvestors = [...byInvestor.values()]
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 6);

      const investorByMonth = months.map((m) => ({
        value: rows.filter((inv) => {
          if (inv.status !== "active") return false;
          const raw = inv.payment_date || inv.created_at;
          if (!raw) return false;
          const dt = new Date(raw);
          return monthKey(dt) === m.month;
        }).length,
      }));

      setAnalytics({
        volumeByMonth: months,
        volumeSparkline: months.map((m) => ({ value: m.volume })),
        statusDistribution,
        pendingCount: pending.length,
        activeCount: active.length,
        monthVolume: thisMonth,
        volumeChange,
        recentInvestors,
        investorSparkline: investorByMonth,
      });
      setLoading(false);
    }

    load();
  }, []);

  return { analytics, loading };
}
