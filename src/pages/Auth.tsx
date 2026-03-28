import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Mail, Lock, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { usePageMeta } from "@/hooks/usePageMeta";
import { APP_NAME } from "@/lib/brand";

const Auth = () => {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  usePageMeta({
    title: "Masuk",
    description: "Masuk atau daftar ke RumahQu untuk mengelola stok rumah tangga bersama keluarga.",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setSubmitting(false);
    if (error) {
      toast({ title: "Gagal masuk", description: error, variant: "destructive" });
    } else {
      navigate("/");
    }
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
    const { error } = await signUp(regEmail, regPassword, regName);
    setSubmitting(false);
    if (error) {
      toast({ title: "Gagal daftar", description: error, variant: "destructive" });
    } else {
      toast({ title: "Berhasil!", description: "Akun berhasil dibuat" });
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto bg-primary rounded-xl p-3 w-fit">
            <Package className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-extrabold">{APP_NAME}</CardTitle>
          <CardDescription>Kelola inventaris rumah tangga bersama keluarga</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="w-full">
              <TabsTrigger value="login" className="flex-1 font-bold">Masuk</TabsTrigger>
              <TabsTrigger value="register" className="flex-1 font-bold">Daftar</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="login-email" type="email" placeholder="email@contoh.com" className="pl-10" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-pass">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="login-pass" type="password" placeholder="••••••" className="pl-10" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                  </div>
                </div>
                <Button type="submit" className="w-full font-bold text-base" disabled={submitting}>Masuk</Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name">Nama Lengkap</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="reg-name" placeholder="Nama kamu" className="pl-10" value={regName} onChange={(e) => setRegName(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="reg-email" type="email" placeholder="email@contoh.com" className="pl-10" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-pass">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="reg-pass" type="password" placeholder="Min. 6 karakter" className="pl-10" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-confirm">Konfirmasi Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="reg-confirm" type="password" placeholder="Ulangi password" className="pl-10" value={regConfirm} onChange={(e) => setRegConfirm(e.target.value)} required />
                  </div>
                </div>
                <Button type="submit" className="w-full font-bold text-base" disabled={submitting}>Daftar</Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
