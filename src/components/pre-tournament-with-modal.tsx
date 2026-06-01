"use client";

import { useState, useCallback } from "react";
import PreTournamentList from "@/components/pre-tournament-list";
import PorraDetailModal from "@/components/porra-detail-modal";
import UserDetailModal from "@/components/user-detail-modal";
import type { PreTournamentEntry } from "@/components/pre-tournament-list";
import type { UserBracketData } from "@/app/porra/actions";
import type { UserDetail } from "@/app/ranking/actions";
import { getUserBracket } from "@/app/porra/actions";
import { getUserDetail } from "@/app/ranking/actions";

interface Props {
  entries: PreTournamentEntry[];
  currentUserId: string;
  mode: "porra" | "quiniela";
  subtitle?: string;
}

export default function PreTournamentWithModal({ entries, currentUserId, mode, subtitle }: Props) {
  const [porraDetail, setPorraDetail] = useState<UserBracketData | null>(null);
  const [quinielaDetail, setQuinielaDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const openDetail = useCallback(async (userId: string) => {
    setLoading(userId);
    try {
      if (mode === "porra") {
        setPorraDetail(await getUserBracket(userId));
      } else {
        setQuinielaDetail(await getUserDetail(userId));
      }
    } finally {
      setLoading(null);
    }
  }, [mode]);

  return (
    <>
      {porraDetail && (
        <PorraDetailModal data={porraDetail} onClose={() => setPorraDetail(null)} />
      )}
      {quinielaDetail && (
        <UserDetailModal
          detail={quinielaDetail}
          position={entries.findIndex((e) => e.id === quinielaDetail.id) + 1}
          onClose={() => setQuinielaDetail(null)}
        />
      )}
      <PreTournamentList
        entries={entries}
        currentUserId={currentUserId}
        mode={mode}
        subtitle={subtitle}
        onUserClick={openDetail}
        loadingUserId={loading}
      />
    </>
  );
}
