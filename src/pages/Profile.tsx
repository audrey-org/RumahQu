import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Shield, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { usePageMeta } from "@/hooks/usePageMeta";

const Profile = () => {
  const { user, updateProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(user?.fullName || "");

  usePageMeta({
    title: "Profil",
    description: "Kelola profil akun dan preferensi dasar Anda di RumahQu.",
    noIndex: true,
    canonicalPath: "/profile",
  });

  if (!user) {
    return null;
  }

  const initials = user.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSave = async () => {
    if (!fullName.trim()) return;
    const result = await updateProfile({ fullName: fullName.trim() });
    if (result.error) {
      toast({ title: "Gagal", description: result.error, variant: "destructive" });
      return;
    }
    toast({ title: "Berhasil", description: "Profil diperbarui" });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto flex items-center gap-3 py-4 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/app")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-extrabold">Profil</h1>
        </div>
      </header>

      <main className="container mx-auto max-w-md space-y-6 px-4 py-8 pb-32 md:pb-8">
        <div className="flex flex-col items-center gap-3">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
              {initials || <User className="h-8 w-8" />}
            </AvatarFallback>
          </Avatar>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">Informasi Akun</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user.email} disabled className="opacity-60" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Nama Lengkap</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Bergabung sejak</Label>
              <Input value={new Date(user.createdAt).toLocaleDateString("id-ID")} disabled className="opacity-60" />
            </div>
            <Button onClick={() => void handleSave()} className="w-full font-bold gap-2">
              <Save className="h-4 w-4" /> Simpan Perubahan
            </Button>
          </CardContent>
        </Card>

        {user.role === "admin" && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Shield className="h-4 w-4 text-primary" />
                Area Admin
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Buka dashboard admin untuk melihat statistik user dan daftar akun secara read-only.
              </p>
              <Button onClick={() => navigate("/admin")} className="w-full font-bold gap-2">
                <Shield className="h-4 w-4" /> Buka Dashboard Admin
              </Button>
            </CardContent>
          </Card>
        )}

        <Button variant="outline" onClick={() => void handleSignOut()} className="w-full font-bold text-destructive border-destructive/30 hover:bg-destructive/10">
          Keluar
        </Button>
      </main>
    </div>
  );
};

export default Profile;
