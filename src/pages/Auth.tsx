import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Lock, Mail, Package, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { usePageMeta } from "@/hooks/usePageMeta";
import { APP_NAME } from "@/lib/brand";

const Auth = () => {
  const { signIn, signUp, resendVerificationEmail, requestPasswordReset, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"login" | "register">(() => (
    searchParams.get("tab") === "register" ? "register" : "login"
  ));
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [nextPasswordConfirm, setNextPasswordConfirm] = useState("");
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [requestingReset, setRequestingReset] = useState(false);
  const [savingNewPassword, setSavingNewPassword] = useState(false);

  usePageMeta({
    title: "Masuk",
    description: "Masuk atau daftar ke RumahQu untuk mengelola stok rumah tangga bersama keluarga.",
    noIndex: true,
    canonicalPath: "/auth",
  });

  const mode = searchParams.get("mode");
  const tab = searchParams.get("tab");
  const verificationStatus = searchParams.get("verification");
  const resetStatus = searchParams.get("reset");
  const resetToken = searchParams.get("token")?.trim() ?? "";
  const isForgotPasswordMode = mode === "forgot-password";
  const isResetPasswordMode = mode === "reset-password";

  useEffect(() => {
    if (isForgotPasswordMode || isResetPasswordMode) {
      return;
    }

    setActiveTab(tab === "register" ? "register" : "login");
  }, [isForgotPasswordMode, isResetPasswordMode, tab]);

  const verificationAlert = useMemo(() => {
    if (resetStatus === "success") {
      return {
        title: "Password berhasil direset",
        description: "Silakan masuk menggunakan password baru Anda.",
        variant: "default" as const,
      };
    }

    if (resetStatus === "expired") {
      return {
        title: "Link reset password kedaluwarsa",
        description: "Minta link reset baru lalu gunakan email terbaru yang kami kirimkan.",
        variant: "destructive" as const,
      };
    }

    if (resetStatus === "invalid") {
      return {
        title: "Link reset password tidak valid",
        description: "Pastikan Anda membuka link reset password terbaru dari email RumahQu.",
        variant: "destructive" as const,
      };
    }

    if (verificationStatus === "expired") {
      return {
        title: "Link verifikasi kedaluwarsa",
        description: "Minta link baru lalu buka email terbaru yang kami kirimkan.",
        variant: "destructive" as const,
      };
    }

    if (verificationStatus === "invalid") {
      return {
        title: "Link verifikasi tidak valid",
        description: "Pastikan Anda membuka link terbaru dari email verifikasi RumahQu.",
        variant: "destructive" as const,
      };
    }

    return null;
  }, [resetStatus, verificationStatus]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await signIn(loginEmail, loginPassword);
    setSubmitting(false);

    if (result.error) {
      if (result.code === "EMAIL_NOT_VERIFIED") {
        setPendingVerificationEmail(result.email ?? loginEmail.trim());
      }
      toast({ title: "Gagal masuk", description: result.error, variant: "destructive" });
      return;
    }

    navigate("/app");
  };

  const handleTabChange = (value: string) => {
    const nextTab: "login" | "register" = value === "register" ? "register" : "login";
    setActiveTab(nextTab);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", nextTab);
    nextParams.delete("mode");
    nextParams.delete("verification");
    nextParams.delete("reset");
    nextParams.delete("token");
    setSearchParams(nextParams, { replace: true });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (regPassword !== regConfirm) {
      toast({ title: "Gagal", description: "Password tidak cocok", variant: "destructive" });
      return;
    }

    if (regPassword.length < 6) {
      toast({ title: "Gagal", description: "Password minimal 6 karakter", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const result = await signUp(regEmail, regPassword, regName);
    setSubmitting(false);

    if (result.error) {
      toast({ title: "Gagal daftar", description: result.error, variant: "destructive" });
      return;
    }

    const email = result.email ?? regEmail.trim();
    setPendingVerificationEmail(email);
    setLoginEmail(email);
    setLoginPassword("");
    setRegPassword("");
    setRegConfirm("");
    setActiveTab("login");
    toast({
      title: "Cek email Anda",
      description: result.message ?? "Kami sudah mengirim link verifikasi email.",
    });
  };

  const handleResendVerification = async () => {
    if (!pendingVerificationEmail) {
      return;
    }

    setResending(true);
    const result = await resendVerificationEmail(pendingVerificationEmail);
    setResending(false);

    if (result.error) {
      toast({ title: "Gagal kirim ulang", description: result.error, variant: "destructive" });
      return;
    }

    toast({
      title: "Link verifikasi dikirim ulang",
      description: result.message ?? "Silakan cek inbox atau folder spam Anda.",
    });
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestingReset(true);
    const result = await requestPasswordReset(forgotEmail);
    setRequestingReset(false);

    if (result.error) {
      toast({ title: "Gagal mengirim email", description: result.error, variant: "destructive" });
      return;
    }

    setLoginEmail(forgotEmail.trim());
    toast({
      title: "Cek email Anda",
      description: result.message ?? "Jika email terdaftar, kami sudah mengirim link reset password.",
    });
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetToken) {
      toast({ title: "Gagal", description: "Token reset password tidak ditemukan.", variant: "destructive" });
      return;
    }

    if (nextPassword !== nextPasswordConfirm) {
      toast({ title: "Gagal", description: "Password tidak cocok", variant: "destructive" });
      return;
    }

    if (nextPassword.length < 6) {
      toast({ title: "Gagal", description: "Password minimal 6 karakter", variant: "destructive" });
      return;
    }

    setSavingNewPassword(true);
    const result = await resetPassword(resetToken, nextPassword);
    setSavingNewPassword(false);

    if (result.error) {
      if (result.code === "RESET_TOKEN_EXPIRED") {
        navigate("/auth?mode=forgot-password&reset=expired", { replace: true });
      } else if (result.code === "RESET_TOKEN_INVALID") {
        navigate("/auth?mode=forgot-password&reset=invalid", { replace: true });
      }

      toast({ title: "Gagal reset password", description: result.error, variant: "destructive" });
      return;
    }

    setNextPassword("");
    setNextPasswordConfirm("");
    navigate("/auth?reset=success", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,hsl(36_33%_98%),hsl(var(--background))_26%)]">
      <header className="sticky top-0 z-20 border-b bg-card/80 backdrop-blur-sm">
        <div className="container max-w-4xl mx-auto flex items-center justify-between py-4 px-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="bg-primary rounded-xl p-2 shadow-[0_14px_30px_hsl(var(--primary)/0.22)]">
              <Package className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold leading-tight">{APP_NAME}</h1>
              <p className="text-xs text-muted-foreground font-medium">Kelola inventaris rumah tangga bersama keluarga</p>
            </div>
          </Link>
          <Button asChild variant="outline" className="rounded-full border-primary/20 bg-background/80 font-bold">
            <Link to="/">Kembali ke Home</Link>
          </Button>
        </div>
      </header>

      <main className="flex items-center justify-center p-4 py-10">
        <Card className="w-full max-w-md border-border/70 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto w-fit rounded-xl bg-primary p-3">
              <Package className="h-8 w-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-extrabold">{APP_NAME}</CardTitle>
            <CardDescription>Kelola inventaris rumah tangga bersama keluarga</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {verificationAlert ? (
                <Alert variant={verificationAlert.variant}>
                  <AlertTitle>{verificationAlert.title}</AlertTitle>
                  <AlertDescription>{verificationAlert.description}</AlertDescription>
                </Alert>
              ) : null}

              {pendingVerificationEmail ? (
                <Alert>
                  <AlertTitle>Verifikasi email dibutuhkan</AlertTitle>
                  <AlertDescription className="space-y-3">
                    <p>
                      Akun untuk <strong>{pendingVerificationEmail}</strong> belum aktif. Buka email verifikasi yang
                      kami kirim, lalu lanjut login setelah email terverifikasi.
                    </p>
                    <Button type="button" variant="outline" onClick={handleResendVerification} disabled={resending}>
                      {resending ? "Mengirim..." : "Kirim Ulang Email Verifikasi"}
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : null}

              {isForgotPasswordMode ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="email@contoh.com"
                        className="pl-10"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full text-base font-bold" disabled={requestingReset}>
                    {requestingReset ? "Mengirim..." : "Kirim Link Reset Password"}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => navigate("/auth?tab=login")}>
                    <ArrowLeft className="h-4 w-4" />
                    Kembali ke login
                  </Button>
                </form>
              ) : isResetPasswordMode ? (
                resetToken ? (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-password">Password Baru</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reset-password"
                          type="password"
                          placeholder="Min. 6 karakter"
                          className="pl-10"
                          value={nextPassword}
                          onChange={(e) => setNextPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reset-password-confirm">Konfirmasi Password Baru</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reset-password-confirm"
                          type="password"
                          placeholder="Ulangi password baru"
                          className="pl-10"
                          value={nextPasswordConfirm}
                          onChange={(e) => setNextPasswordConfirm(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full text-base font-bold" disabled={savingNewPassword}>
                      {savingNewPassword ? "Menyimpan..." : "Simpan Password Baru"}
                    </Button>
                    <Button type="button" variant="ghost" className="w-full" onClick={() => navigate("/auth?tab=login")}>
                      <ArrowLeft className="h-4 w-4" />
                      Kembali ke login
                    </Button>
                  </form>
                ) : (
                <div className="space-y-4">
                  <Alert variant="destructive">
                    <AlertTitle>Link reset tidak lengkap</AlertTitle>
                    <AlertDescription>Token reset password tidak ditemukan. Silakan minta link baru.</AlertDescription>
                  </Alert>
                    <Button
                      type="button"
                      className="w-full text-base font-bold"
                      onClick={() => navigate("/auth?mode=forgot-password&tab=login")}
                    >
                      Minta Link Reset Baru
                    </Button>
                  </div>
                )
              ) : (
                <Tabs value={activeTab} onValueChange={handleTabChange}>
                  <TabsList className="w-full">
                    <TabsTrigger value="login" className="flex-1 font-bold">
                      Masuk
                    </TabsTrigger>
                    <TabsTrigger value="register" className="flex-1 font-bold">
                      Daftar
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="login">
                    <form onSubmit={handleLogin} className="mt-4 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="email@contoh.com"
                            className="pl-10"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-pass">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="login-pass"
                            type="password"
                            placeholder="Password kamu"
                            className="pl-10"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button type="button" variant="link" className="px-0" onClick={() => navigate("/auth?mode=forgot-password&tab=login")}>
                          Lupa password?
                        </Button>
                      </div>
                      <Button type="submit" className="w-full text-base font-bold" disabled={submitting}>
                        Masuk
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="register">
                    <form onSubmit={handleRegister} className="mt-4 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="reg-name">Nama Lengkap</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="reg-name"
                            placeholder="Nama kamu"
                            className="pl-10"
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="reg-email"
                            type="email"
                            placeholder="email@contoh.com"
                            className="pl-10"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-pass">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="reg-pass"
                            type="password"
                            placeholder="Min. 6 karakter"
                            className="pl-10"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-confirm">Konfirmasi Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="reg-confirm"
                            type="password"
                            placeholder="Ulangi password"
                            className="pl-10"
                            value={regConfirm}
                            onChange={(e) => setRegConfirm(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <Button type="submit" className="w-full text-base font-bold" disabled={submitting}>
                        Daftar
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Auth;
