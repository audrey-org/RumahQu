import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Plus, Mail, Trash2, Crown, UserPlus, Check, X, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useGroup } from "@/contexts/GroupContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { usePageMeta } from "@/hooks/usePageMeta";

const Groups = () => {
  const { user } = useAuth();
  const {
    activeGroup,
    userGroups,
    members,
    pendingInvites,
    loading,
    error,
    switchGroup,
    createGroup,
    inviteMember,
    acceptInvite,
    declineInvite,
    removeMember,
  } = useGroup();
  const navigate = useNavigate();
  const [newGroupName, setNewGroupName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  usePageMeta({
    title: "Grup",
    description: "Atur grup keluarga, kirim undangan, dan kolaborasi inventaris rumah tangga di RumahQu.",
  });

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;

    try {
      const createdGroup = await createGroup(newGroupName.trim());
      setNewGroupName("");
      setCreateOpen(false);
      toast({ title: "Grup dibuat!", description: `"${createdGroup.name}" berhasil dibuat.` });
    } catch (groupError) {
      toast({ title: "Gagal", description: groupError instanceof Error ? groupError.message : "Tidak dapat membuat grup", variant: "destructive" });
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    const result = await inviteMember(inviteEmail.trim());
    if (result.error) {
      toast({ title: "Gagal", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Undangan terkirim!", description: `${inviteEmail.trim()} telah diundang.` });
      setInviteEmail("");
      setInviteOpen(false);
    }
  };

  const handleAcceptInvite = async (inviteId: string, groupName: string) => {
    await acceptInvite(inviteId);
    toast({ title: "Bergabung!", description: `Anda bergabung ke "${groupName}"` });
  };

  const handleDeclineInvite = async (inviteId: string) => {
    await declineInvite(inviteId);
  };

  const handleRemoveMember = async (memberUserId: string) => {
    const result = await removeMember(memberUserId);
    if (result.error) {
      toast({ title: "Gagal", description: result.error, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto flex items-center gap-3 py-4 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-extrabold">Grup & Kolaborasi</h1>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border bg-card px-4 py-6 text-sm text-muted-foreground">
            Memuat data grup...
          </div>
        )}

        {pendingInvites.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Undangan Masuk</h2>
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-4">
                <div>
                  <p className="font-bold">{inv.groupName}</p>
                  <p className="text-sm text-muted-foreground">Diundang oleh {inv.invitedByFullName}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => void handleAcceptInvite(inv.id, inv.groupName)}>
                    <Check className="h-4 w-4 mr-1" /> Terima
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void handleDeclineInvite(inv.id)}>
                    <X className="h-4 w-4 mr-1" /> Tolak
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Grup Saya</h2>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" /> Buat Grup
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Buat Grup Baru</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid gap-2">
                    <Label>Nama Grup</Label>
                    <Input placeholder="Contoh: Dapur Keluarga" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} />
                  </div>
                  <Button onClick={() => void handleCreateGroup()} disabled={!newGroupName.trim()}>Buat Grup</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {userGroups.map((group) => (
            <div
              key={group.id}
              className={`rounded-lg border p-4 transition-all cursor-pointer ${
                group.id === activeGroup?.id ? "border-primary bg-primary/5 shadow-sm" : "hover:bg-accent/50"
              }`}
              onClick={() => switchGroup(group.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base">{group.name}</span>
                  {group.id === activeGroup?.id && (
                    <Badge className="text-xs">Aktif</Badge>
                  )}
                  {group.createdBy === user?.id && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Crown className="h-3 w-3" /> Owner
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-xs">
                    <Users className="h-3 w-3 mr-1" />
                    {group.memberCount} anggota
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>

        {activeGroup && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
                Anggota "{activeGroup.name}"
              </h2>
              {activeGroup.createdBy === user?.id && (
                <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1">
                      <UserPlus className="h-4 w-4" /> Undang
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Undang Anggota</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                      <div className="grid gap-2">
                        <Label>Email</Label>
                        <Input type="email" placeholder="email@contoh.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                      </div>
                      <Button onClick={() => void handleInvite()} disabled={!inviteEmail.trim()}>
                        <Mail className="h-4 w-4 mr-2" /> Kirim Undangan
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {members.map((member) => (
              <div key={member.userId} className="flex items-center justify-between rounded-lg border bg-card p-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                    {member.fullName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{member.fullName}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={member.role === "owner" ? "default" : "secondary"} className="text-xs">
                    {member.role === "owner" ? "Owner" : "Anggota"}
                  </Badge>
                  {activeGroup.createdBy === user?.id && member.userId !== user?.id && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); void handleRemoveMember(member.userId); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {member.userId === user?.id && member.role !== "owner" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-muted-foreground hover:text-destructive gap-1"
                      onClick={(e) => { e.stopPropagation(); void handleRemoveMember(member.userId); }}
                    >
                      <LogOut className="h-3.5 w-3.5" /> Keluar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Groups;
