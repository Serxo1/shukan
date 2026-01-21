import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useFriends } from "@/hooks/useFriends";
import { useRankings, type RankingEntry } from "@/hooks/useRankings";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { Profile } from "@/types/database";

type SubTab = "rankings" | "friends" | "competitions";

// Medal icons
const MedalIcon = ({ rank, className = "" }: { rank: number; className?: string }) => {
  if (rank === 1) {
    return (
      <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="6" fill="#FFD700" stroke="#B8860B" strokeWidth="1.5" />
        <path d="M12 14v6M9 24h6" stroke="#B8860B" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 5v2M10 7h4" stroke="#B8860B" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (rank === 2) {
    return (
      <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="6" fill="#C0C0C0" stroke="#808080" strokeWidth="1.5" />
        <path d="M12 14v6M9 24h6" stroke="#808080" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (rank === 3) {
    return (
      <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="6" fill="#CD7F32" stroke="#8B4513" strokeWidth="1.5" />
        <path d="M12 14v6M9 24h6" stroke="#8B4513" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return null;
};

export function SocialTab() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("rankings");

  // Show login prompt if not authenticated
  if (!isAuthenticated || !isSupabaseConfigured()) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/[0.03] flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/20">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <p className="text-white/40 text-sm">{t("social.loginRequired", "Faça login para acessar recursos sociais")}</p>
          <p className="text-white/20 text-xs mt-1">{t("social.loginDescription", "Conecte-se para competir com amigos e ver rankings")}</p>
        </div>
      </div>
    );
  }

  const subTabs: { id: SubTab; label: string; icon: React.ReactNode }[] = [
    {
      id: "rankings",
      label: t("social.tabs.rankings", "Rankings"),
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M8 21v-6M12 21V9M16 21v-4M6 21h12" />
        </svg>
      ),
    },
    {
      id: "friends",
      label: t("social.tabs.friends", "Amigos"),
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      id: "competitions",
      label: t("social.tabs.competitions", "Competições"),
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Sub-tabs */}
      <div className="flex-shrink-0 px-6 pt-4 pb-3 border-b border-white/[0.04]">
        <div className="flex gap-1 p-1 bg-white/[0.02] rounded-lg w-fit">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] transition-all ${
                activeSubTab === tab.id
                  ? "bg-white/[0.08] text-white/80"
                  : "text-white/30 hover:text-white/50"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeSubTab === "rankings" && <RankingsSection />}
        {activeSubTab === "friends" && <FriendsSection />}
        {activeSubTab === "competitions" && <CompetitionsSection />}
      </div>
    </div>
  );
}

// Ranking item component
function RankingItem({ entry }: { entry: RankingEntry }) {
  const { t } = useTranslation();

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
        entry.isCurrentUser ? "bg-white/[0.06]" : "hover:bg-white/[0.02]"
      }`}
    >
      {/* Rank */}
      <div className="w-8 flex items-center justify-center">
        {entry.rank <= 3 ? (
          <MedalIcon rank={entry.rank} />
        ) : (
          <span className="font-mono text-sm text-white/40">#{entry.rank}</span>
        )}
      </div>

      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center overflow-hidden">
        {entry.avatar_url ? (
          <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-white/30 text-xs font-medium">
            {(entry.display_name || entry.username || "?")[0].toUpperCase()}
          </span>
        )}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${entry.isCurrentUser ? "text-white/90" : "text-white/70"}`}>
          {entry.display_name || entry.username}
          {entry.isCurrentUser && (
            <span className="ml-1.5 text-[10px] text-white/30">({t("social.rankings.you", "você")})</span>
          )}
        </p>
        {entry.username && entry.display_name && (
          <p className="text-[11px] text-white/30">@{entry.username}</p>
        )}
      </div>

      {/* Stats */}
      <div className="text-right">
        <p className="font-mono text-sm text-white/60">{entry.total_streak || 0}d</p>
        <p className="text-[10px] text-white/25">{entry.habit_count || 0} {t("social.rankings.habits", "hábitos")}</p>
      </div>
    </div>
  );
}

// Rankings Section
function RankingsSection() {
  const { t } = useTranslation();
  const { friends } = useFriends();
  const { globalRankings, friendsRankings, isLoading, fetchGlobalRankings, fetchFriendsRankings, getUserRank } = useRankings();
  const [rankingType, setRankingType] = useState<"global" | "friends">("global");

  useEffect(() => {
    fetchGlobalRankings();
  }, [fetchGlobalRankings]);

  useEffect(() => {
    if (friends.length > 0) {
      const friendIds = friends.map((f) => f.friend.id);
      fetchFriendsRankings(friendIds);
    }
  }, [friends, fetchFriendsRankings]);

  const currentRankings = rankingType === "global" ? globalRankings : friendsRankings;
  const userRank = getUserRank(rankingType === "global" ? undefined : 0);

  return (
    <div className="p-6 space-y-4">
      {/* Ranking type toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setRankingType("global")}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
            rankingType === "global"
              ? "bg-white/10 text-white/80"
              : "bg-white/[0.03] text-white/40 hover:text-white/60"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          {t("social.rankings.global", "Global")}
        </button>
        <button
          onClick={() => setRankingType("friends")}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
            rankingType === "friends"
              ? "bg-white/10 text-white/80"
              : "bg-white/[0.03] text-white/40 hover:text-white/60"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          {t("social.rankings.friends", "Amigos")}
          {friends.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded bg-white/10 text-[10px]">
              {friends.length + 1}
            </span>
          )}
        </button>
      </div>

      {/* User rank card */}
      {userRank && (
        <div className="p-3 rounded-lg bg-white/[0.04] border border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10">
              {userRank <= 3 ? (
                <MedalIcon rank={userRank} className="w-8 h-8" />
              ) : (
                <span className="font-mono text-xl text-white/60">#{userRank}</span>
              )}
            </div>
            <div>
              <p className="text-[11px] text-white/40 uppercase tracking-wide">
                {t("social.rankings.yourRank", "Sua posição")}
              </p>
              <p className="text-sm text-white/70">
                {rankingType === "global"
                  ? t("social.rankings.inGlobal", "no ranking global")
                  : t("social.rankings.amongFriends", "entre amigos")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Rankings list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        </div>
      ) : currentRankings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-white/30 text-sm">
            {rankingType === "friends" && friends.length === 0
              ? t("social.rankings.noFriends", "Adicione amigos para ver o ranking")
              : t("social.rankings.empty", "Nenhum ranking disponível")}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {currentRankings.map((entry) => (
            <RankingItem key={`${entry.user_id}-${entry.category_id}`} entry={entry} />
          ))}
        </div>
      )}

      {/* Info about public profiles */}
      {rankingType === "global" && (
        <p className="text-[10px] text-white/20 text-center pt-2">
          {t("social.rankings.publicOnly", "Apenas perfis públicos aparecem no ranking global")}
        </p>
      )}
    </div>
  );
}

// Friends Section
function FriendsSection() {
  const { t } = useTranslation();
  const {
    friends,
    pendingRequests,
    sentRequests,
    isLoading,
    searchUsers,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
  } = useFriends();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchUsers(query);
      // Filter out already friends
      const friendIds = new Set(friends.map((f) => f.friend.id));
      const pendingIds = new Set([
        ...pendingRequests.map((r) => r.friend.id),
        ...sentRequests.map((r) => r.friend.id),
      ]);
      setSearchResults(results.filter((r) => !friendIds.has(r.id) && !pendingIds.has(r.id)));
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    try {
      await sendFriendRequest(userId);
      setSearchResults((prev) => prev.filter((r) => r.id !== userId));
    } catch (error) {
      console.error("Send request error:", error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Search */}
      <div className="space-y-2">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20"
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder={t("social.friends.searchPlaceholder", "Buscar usuários...")}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white/[0.03] rounded-lg text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:bg-white/[0.05] transition-colors"
          />
        </div>

        {/* Search results */}
        {searchQuery.length >= 2 && (
          <div className="space-y-1">
            {isSearching ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
              </div>
            ) : searchResults.length === 0 ? (
              <p className="text-center py-4 text-white/30 text-sm">
                {t("social.friends.noResults", "Nenhum usuário encontrado")}
              </p>
            ) : (
              searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02]"
                >
                  <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <span className="text-white/30 text-xs">
                        {(user.display_name || user.username || "?")[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/70 truncate">{user.display_name || user.username}</p>
                    <p className="text-[11px] text-white/30">@{user.username}</p>
                  </div>
                  <button
                    onClick={() => handleSendRequest(user.id)}
                    className="flex items-center gap-1 px-3 py-1 rounded-md bg-white/[0.06] text-[11px] text-white/60 hover:bg-white/[0.1] hover:text-white/80 transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <line x1="20" y1="8" x2="20" y2="14" />
                      <line x1="23" y1="11" x2="17" y2="11" />
                    </svg>
                    {t("social.friends.addFriend", "Adicionar")}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[11px] text-white/30 uppercase tracking-wide">
            {t("social.friends.pendingRequests", "Solicitações pendentes")} ({pendingRequests.length})
          </h3>
          {pendingRequests.map((request) => (
            <div
              key={request.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]"
            >
              <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center">
                {request.friend.avatar_url ? (
                  <img src={request.friend.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <span className="text-white/30 text-xs">
                    {(request.friend.display_name || request.friend.username || "?")[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/70 truncate">
                  {request.friend.display_name || request.friend.username}
                </p>
                <p className="text-[11px] text-white/30">@{request.friend.username}</p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => acceptFriendRequest(request.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/10 text-[11px] text-white/70 hover:bg-white/20 transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {t("social.friends.accept", "Aceitar")}
                </button>
                <button
                  onClick={() => rejectFriendRequest(request.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.03] text-[11px] text-white/40 hover:bg-white/[0.06] transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Friends list */}
      <div className="space-y-2">
        <h3 className="text-[11px] text-white/30 uppercase tracking-wide">
          {t("social.friends.title", "Amigos")} ({friends.length})
        </h3>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        ) : friends.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/[0.03] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/20">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <p className="text-white/30 text-sm">{t("social.friends.empty", "Nenhum amigo ainda")}</p>
            <p className="text-white/20 text-xs mt-1">
              {t("social.friends.emptyHint", "Use a busca acima para encontrar amigos")}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {friends.map((friendship) => (
              <div
                key={friendship.id}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.02] transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center overflow-hidden">
                  {friendship.friend.avatar_url ? (
                    <img src={friendship.friend.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white/30 text-xs">
                      {(friendship.friend.display_name || friendship.friend.username || "?")[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/70 truncate">
                    {friendship.friend.display_name || friendship.friend.username}
                  </p>
                  <p className="text-[11px] text-white/30">@{friendship.friend.username}</p>
                </div>
                <button
                  onClick={() => removeFriend(friendship.id)}
                  className="w-6 h-6 flex items-center justify-center text-white/0 group-hover:text-white/20 hover:!text-white/40 transition-colors"
                  title={t("social.friends.remove", "Remover amigo")}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Competitions Section (Coming Soon)
function CompetitionsSection() {
  const { t } = useTranslation();

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/[0.03] flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/20">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
          </svg>
        </div>
        <p className="text-white/40 text-sm">{t("social.competitions.comingSoon", "Em breve!")}</p>
        <p className="text-white/20 text-xs mt-1">
          {t("social.competitions.description", "Crie competições e desafie seus amigos")}
        </p>
      </div>
    </div>
  );
}
