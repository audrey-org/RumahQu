import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, Shield, Users } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { api, getErrorMessage } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const chartConfig = {
  signups: {
    label: "Signup",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

function formatShortDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  usePageMeta({
    title: "Admin Dashboard",
    description: "Pantau statistik user dan aktivitas signup platform secara aman dari area admin RumahQu.",
    noIndex: true,
    canonicalPath: "/admin",
  });

  const statsQuery = useQuery({
    queryKey: queryKeys.adminStats,
    retry: false,
    queryFn: () => api.getAdminStats(),
  });

  const usersQuery = useQuery({
    queryKey: queryKeys.adminUsers,
    retry: false,
    queryFn: () => api.getAdminUsers(),
  });

  const errorMessage = useMemo(() => {
    if (statsQuery.error) {
      return getErrorMessage(statsQuery.error);
    }

    if (usersQuery.error) {
      return getErrorMessage(usersQuery.error);
    }

    return null;
  }, [statsQuery.error, usersQuery.error]);

  const totalUsers = statsQuery.data?.totalUsers ?? 0;
  const verifiedUsers = statsQuery.data?.verifiedUsers ?? 0;
  const verificationRate = totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0;

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/app")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-extrabold">Admin Dashboard</h1>
              </div>
              <p className="text-sm text-muted-foreground">Area admin read-only untuk monitoring user platform.</p>
            </div>
          </div>
          <Badge variant="outline" className="hidden gap-1 text-xs font-semibold sm:inline-flex">
            <Shield className="h-3.5 w-3.5" />
            {user.email}
          </Badge>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl space-y-6 px-4 py-6 pb-32 md:pb-8">
        {errorMessage && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card className="rounded-3xl border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <Users className="h-4 w-4 text-primary" />
                Total User
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-extrabold tracking-tight">{totalUsers.toLocaleString("id-ID")}</p>
              <p className="mt-2 text-sm text-muted-foreground">Seluruh akun yang tercatat di tabel `users`.</p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-emerald-500/20 bg-emerald-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <BadgeCheck className="h-4 w-4 text-emerald-600" />
                Verified User
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-extrabold tracking-tight">{verifiedUsers.toLocaleString("id-ID")}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {verificationRate}% user sudah verifikasi email.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl xl:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Status Akses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Halaman ini hanya bisa diakses user dengan role global `admin`.</p>
              <p>Semua data di sini read-only, tanpa edit role atau aksi sensitif lain.</p>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="text-lg font-extrabold">Signup Harian 30 Hari Terakhir</CardTitle>
          </CardHeader>
          <CardContent>
            {statsQuery.isLoading ? (
              <div className="py-16 text-center text-sm text-muted-foreground">Memuat statistik signup...</div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <LineChart data={statsQuery.data?.dailySignups ?? []} margin={{ left: 8, right: 8, top: 12, bottom: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                    tickFormatter={formatShortDate}
                  />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(label) =>
                          typeof label === "string"
                            ? new Date(`${label}T00:00:00.000Z`).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })
                            : ""
                        }
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="var(--color-signups)"
                    strokeWidth={3}
                    dot={{ fill: "var(--color-signups)" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="text-lg font-extrabold">Daftar User</CardTitle>
          </CardHeader>
          <CardContent>
            {usersQuery.isLoading ? (
              <div className="py-16 text-center text-sm text-muted-foreground">Memuat daftar user...</div>
            ) : (
              <div className="space-y-3">
                {(usersQuery.data?.users ?? []).map((adminUser) => (
                  <div
                    key={adminUser.id}
                    className="flex flex-col gap-3 rounded-2xl border bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold">{adminUser.fullName}</p>
                      <p className="truncate text-sm text-muted-foreground">{adminUser.email}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Bergabung {new Date(adminUser.createdAt).toLocaleDateString("id-ID")}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={adminUser.role === "admin" ? "default" : "secondary"}>
                        {adminUser.role === "admin" ? "Admin" : "User"}
                      </Badge>
                      <Badge variant={adminUser.emailVerifiedAt ? "outline" : "secondary"}>
                        {adminUser.emailVerifiedAt ? "Verified" : "Belum verified"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Admin;
