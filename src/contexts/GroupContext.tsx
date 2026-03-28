import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, getErrorMessage } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { GroupMember, GroupSummary, PendingInvite } from "@/lib/contracts";
import { useAuth } from "@/contexts/AuthContext";

interface GroupContextType {
  activeGroup: GroupSummary | null;
  userGroups: GroupSummary[];
  members: GroupMember[];
  pendingInvites: PendingInvite[];
  loading: boolean;
  error: string | null;
  switchGroup: (groupId: string) => void;
  createGroup: (name: string) => Promise<GroupSummary>;
  inviteMember: (email: string) => Promise<{ error?: string }>;
  acceptInvite: (inviteId: string) => Promise<void>;
  declineInvite: (inviteId: string) => Promise<void>;
  removeMember: (userId: string) => Promise<{ error?: string }>;
  refresh: () => Promise<void>;
}

const GroupContext = createContext<GroupContextType | null>(null);

function getStorageKey(userId: string) {
  return `rumahqu-active-group:${userId}`;
}

function readStoredActiveGroup(userId: string) {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(getStorageKey(userId));
}

function writeStoredActiveGroup(userId: string, groupId: string | null) {
  if (typeof window === "undefined") return;
  const key = getStorageKey(userId);

  if (!groupId) {
    window.localStorage.removeItem(key);
    return;
  }

  window.localStorage.setItem(key, groupId);
}

export function GroupProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  const groupsQuery = useQuery({
    queryKey: queryKeys.groups,
    enabled: Boolean(user),
    retry: false,
    queryFn: () => api.getGroups(),
  });

  const userGroups = useMemo(() => groupsQuery.data?.groups ?? [], [groupsQuery.data?.groups]);
  const pendingInvites = useMemo(() => groupsQuery.data?.pendingInvites ?? [], [groupsQuery.data?.pendingInvites]);

  useEffect(() => {
    if (!userId) {
      setActiveGroupId(null);
      return;
    }

    setActiveGroupId(readStoredActiveGroup(userId));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    if (userGroups.length === 0) {
      writeStoredActiveGroup(userId, null);
      return;
    }

    const currentGroupId = activeGroupId && userGroups.some((group) => group.id === activeGroupId)
      ? activeGroupId
      : userGroups[0].id;

    if (currentGroupId !== activeGroupId) {
      setActiveGroupId(currentGroupId);
    }

    writeStoredActiveGroup(userId, currentGroupId);
  }, [activeGroupId, userGroups, userId]);

  const activeGroup = useMemo(
    () => userGroups.find((group) => group.id === activeGroupId) ?? userGroups[0] ?? null,
    [activeGroupId, userGroups],
  );

  const membersQuery = useQuery({
    queryKey: queryKeys.groupMembers(activeGroup?.id ?? "none"),
    enabled: Boolean(user && activeGroup),
    retry: false,
    queryFn: async () => {
      const response = await api.getGroupMembers(activeGroup!.id);
      return response.members;
    },
  });

  const switchGroup = (groupId: string) => {
    if (!userId) return;
    setActiveGroupId(groupId);
    writeStoredActiveGroup(userId, groupId);
  };

  const refresh = async () => {
    await groupsQuery.refetch();
    if (activeGroup) {
      await membersQuery.refetch();
    }
  };

  const createGroup = async (name: string) => {
    const createdGroup = await api.createGroup(name);
    await groupsQuery.refetch();

    if (userId) {
      setActiveGroupId(createdGroup.id);
      writeStoredActiveGroup(userId, createdGroup.id);
    }

    return createdGroup;
  };

  const inviteMember = async (email: string) => {
    if (!activeGroup) {
      return { error: "Tidak ada grup aktif" };
    }

    try {
      await api.inviteMember(activeGroup.id, email);
      await groupsQuery.refetch();
      return {};
    } catch (error) {
      return { error: getErrorMessage(error) };
    }
  };

  const acceptInvite = async (inviteId: string) => {
    const result = await api.acceptInvite(inviteId);
    await groupsQuery.refetch();

    if (userId) {
      setActiveGroupId(result.groupId);
      writeStoredActiveGroup(userId, result.groupId);
    }
  };

  const declineInvite = async (inviteId: string) => {
    await api.declineInvite(inviteId);
    await groupsQuery.refetch();
  };

  const removeMember = async (userId: string) => {
    if (!activeGroup) {
      return { error: "Tidak ada grup aktif" };
    }

    try {
      await api.removeMember(activeGroup.id, userId);
      await Promise.all([groupsQuery.refetch(), membersQuery.refetch()]);
      return {};
    } catch (error) {
      return { error: getErrorMessage(error) };
    }
  };

  return (
    <GroupContext.Provider
      value={{
        activeGroup,
        userGroups,
        members: membersQuery.data ?? [],
        pendingInvites,
        loading: groupsQuery.isLoading || membersQuery.isLoading,
        error: groupsQuery.error
          ? getErrorMessage(groupsQuery.error)
          : membersQuery.error
            ? getErrorMessage(membersQuery.error)
            : null,
        switchGroup,
        createGroup,
        inviteMember,
        acceptInvite,
        declineInvite,
        removeMember,
        refresh,
      }}
    >
      {children}
    </GroupContext.Provider>
  );
}

export function useGroup() {
  const ctx = useContext(GroupContext);
  if (!ctx) throw new Error("useGroup must be used within GroupProvider");
  return ctx;
}
