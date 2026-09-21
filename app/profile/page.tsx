import ReceivedRevenueCard from "@/components/profile/ReceivedRevenueCard";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

import { UnifiedUserStatusCard } from "@/components/UnifiedUserStatusCard";
import { AuthService } from "@/lib/auth/auth-service";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { ProfileService } from "@/lib/profile/profile-service";
import { SocialService } from "@/lib/social/social-service";
import { WalletService } from "@/lib/wallet/wallet-service";
import { getCreatorLevelSummary, getViewerLevelSummary } from "@/lib/levels";

type MenuCardProps = {
  title: string;
  description: string;
  href?: string;
  badge?: string;
  disabled?: boolean;
};

function MenuCard({
  title,
  description,
  href,
  badge,
  disabled,
}: MenuCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-black text-white">
            {title}
          </h3>

          <p className="mt-1.5 text-xs leading-5 text-zinc-500">
            {description}
          </p>
        </div>

        {disabled ? (
          <span className="shrink-0 rounded-full bg-zinc-800 px-2.5 py-1 text-[10px] font-bold text-zinc-500">
            준비중
          </span>
        ) : (
          <span className="text-lg text-zinc-600 transition group-hover:translate-x-1 group-hover:text-white">
            →
          </span>
        )}
      </div>

      {badge && (
        <div className="mt-4">
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold text-zinc-400">
            {badge}
          </span>
        </div>
      )}
    </>
  );

  if (!href || disabled) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-zinc-950/70 p-4 opacity-70">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="group rounded-2xl border border-white/[0.08] bg-zinc-950 p-4 transition hover:border-white/20 hover:bg-zinc-900"
    >
      {content}
    </Link>
  );
}

export default async function ProfilePage() {
  const cookieStore = await cookies();

  const sessionToken =
    cookieStore.get(
      SESSION_COOKIE_NAME,
    )?.value;

  if (!sessionToken) {
    redirect("/login");
  }

  const snapshot =
    await new AuthService().getCurrentUserSnapshot(
      sessionToken,
    );

  if (!snapshot) {
    redirect("/login");
  }

  const walletService = new WalletService();

  const [
    flatLiveProfile,
    socialStats,
    wallet,
    receivedDonations,
    viewerLevelSummary,
    creatorLevelSummary,
  ] = await Promise.all([
    new ProfileService().getByUserId(
      snapshot.userId,
    ),
    new SocialService().getStats(
      snapshot.userId,
    ),
    walletService.getUserSummary(
      snapshot.userId,
    ),
    walletService.getReceivedDonationSummary(
      snapshot.userId,
    ),
    getViewerLevelSummary(
      snapshot.userId,
    ),
    getCreatorLevelSummary(
      snapshot.userId,
    ),
  ]);

  const profileName =
    flatLiveProfile?.nickname ||
    snapshot.displayName ||
    snapshot.username;

  return (
    <main className="min-h-screen bg-black px-4 pb-28 pt-8 text-white md:px-6 md:pt-24">
      <div className="mx-auto max-w-6xl">
        {/* PROFILE */}
        <section className="rounded-3xl border border-white/[0.08] bg-zinc-950 p-5 md:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-800 text-3xl font-black text-zinc-500">
              {flatLiveProfile?.avatarUrl ? (
                <img
                  src={
                    flatLiveProfile.avatarUrl
                  }
                  alt="프로필"
                  className="h-full w-full object-cover"
                />
              ) : (
                profileName
                  .slice(0, 1)
                  .toUpperCase()
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl font-black md:text-3xl">
                {profileName}
              </h1>

              <p className="mt-1 text-sm text-zinc-500">
                @{snapshot.username}
              </p>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                {flatLiveProfile?.bio ||
                  "나의 FLAT LIVE 프로필"}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/profile/edit"
                  className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold transition hover:bg-white hover:text-black"
                >
                  프로필 편집
                </Link>

                <Link
                  href={`/u/${encodeURIComponent(
                    snapshot.username,
                  )}`}
                  className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold transition hover:bg-white hover:text-black"
                >
                  공개 프로필 보기
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:w-[220px]">
              <Link
                href="/profile/followers?tab=followers"
                className="rounded-2xl bg-black p-4 text-center transition hover:bg-zinc-900"
              >
                <div className="text-xl font-black">
                  {socialStats.followers}
                </div>

                <div className="mt-1 text-[11px] font-bold text-zinc-500">
                  팔로워
                </div>
              </Link>

              <Link
                href="/profile/followers?tab=following"
                className="rounded-2xl bg-black p-4 text-center transition hover:bg-zinc-900"
              >
                <div className="text-xl font-black">
                  {socialStats.following}
                </div>

                <div className="mt-1 text-[11px] font-bold text-zinc-500">
                  팔로잉
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* FLATLIVE_PROFILE_LEVEL_CARD_V1 */}
        <section className="mt-7 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="rounded-3xl border border-yellow-400/20 bg-gradient-to-br from-zinc-950 via-zinc-950 to-yellow-950/20 p-5 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-yellow-300/80">
                  Viewer Level
                </p>

                <h2 className="mt-3 text-3xl font-black text-white md:text-4xl">
                  Lv.{viewerLevelSummary.level.level}
                </h2>

                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  LIVE에서 실제 후원한 FLAT만 누적됩니다.
                  팬가입, VIP, 라운지, 충전 금액은 시청자 레벨에 포함하지 않습니다.
                </p>
              </div>

              <div className="rounded-2xl border border-yellow-300/20 bg-yellow-300/10 px-3 py-2 text-center">
                <div className="text-[10px] font-black text-yellow-200">
                  {viewerLevelSummary.level.badgeTier}
                </div>

                <div className="mt-1 text-lg font-black text-yellow-100">
                  {viewerLevelSummary.cumulativeLiveDonationFlat.toLocaleString("ko-KR")}
                </div>

                <div className="text-[10px] font-bold text-yellow-200/70">
                  누적 FLAT
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-black/40 p-3">
                <div className="text-[10px] font-bold text-zinc-500">
                  라운지 입장
                </div>
                <div className="mt-1 text-xs font-black text-white">
                  {viewerLevelSummary.level.benefits.includes("LOUNGE_ENTRY")
                    ? "가능"
                    : "Lv.30부터"}
                </div>
              </div>

              <div className="rounded-2xl bg-black/40 p-3">
                <div className="text-[10px] font-bold text-zinc-500">
                  입장 BGM
                </div>
                <div className="mt-1 text-xs font-black text-white">
                  {viewerLevelSummary.level.benefits.includes("ENTRY_BGM")
                    ? "가능"
                    : "Lv.51부터"}
                </div>
              </div>

              <div className="rounded-2xl bg-black/40 p-3">
                <div className="text-[10px] font-bold text-zinc-500">
                  입장 효과
                </div>
                <div className="mt-1 text-xs font-black text-white">
                  {viewerLevelSummary.level.benefits.includes("ENTRY_ANIMATION")
                    ? "가능"
                    : "Lv.81부터"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/[0.08] bg-zinc-950 p-5 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-zinc-500">
                  Creator Level
                </p>

                <h2 className="mt-3 text-3xl font-black text-white md:text-4xl">
                  {creatorLevelSummary.isLiveCreator
                    ? `FLATIST Lv.${creatorLevelSummary.level.level}`
                    : "LIVE 기록 없음"}
                </h2>

                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  방송자 레벨은 실제 LIVE 방송자에게만 적용됩니다.
                  영상만 올린 사용자는 방송자 레벨로 표시하지 않습니다.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-center">
                <div className="text-[10px] font-black text-zinc-400">
                  {creatorLevelSummary.level.badgeTier}
                </div>

                <div className="mt-1 text-lg font-black text-white">
                  {creatorLevelSummary.level.supportRatePercent}%
                </div>

                <div className="text-[10px] font-bold text-zinc-500">
                  추가 혜택
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-black/40 p-3">
                <div className="text-[10px] font-bold text-zinc-500">
                  이번 달 LIVE
                </div>
                <div className="mt-1 text-xs font-black text-white">
                  {creatorLevelSummary.monthlyLiveHours.toFixed(1)}시간
                </div>
              </div>

              <div className="rounded-2xl bg-black/40 p-3">
                <div className="text-[10px] font-bold text-zinc-500">
                  팔로워
                </div>
                <div className="mt-1 text-xs font-black text-white">
                  {creatorLevelSummary.followerCount.toLocaleString("ko-KR")}
                </div>
              </div>

              <div className="rounded-2xl bg-black/40 p-3">
                <div className="text-[10px] font-bold text-zinc-500">
                  받은 LIVE 후원
                </div>
                <div className="mt-1 text-xs font-black text-white">
                  {creatorLevelSummary.cumulativeLiveDonationReceivedFlat.toLocaleString("ko-KR")}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ASSET */}
        <section className="mt-7">
          <div className="mb-3">
            <h2 className="text-base font-black">
              자산 · 후원
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Link
              href="/wallet"
              className="rounded-2xl border border-white/[0.08] bg-zinc-950 p-4 transition hover:bg-zinc-900"
            >
              <div className="text-xs font-bold text-zinc-500">
                FLAT
              </div>

              <div className="mt-2 text-2xl font-black">
                {wallet.balances.FLAT.toLocaleString(
                  "ko-KR",
                )}
              </div>
            </Link>

            <Link
              href="/fit"
              className="rounded-2xl border border-yellow-400/15 bg-zinc-950 p-4 transition hover:bg-zinc-900"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-bold text-zinc-500">
                  FIT
                </div>

                <span className="text-[10px] font-black text-yellow-300">
                  POINT
                </span>
              </div>

              <div className="mt-2 text-2xl font-black">
                {wallet.balances.FIT.toLocaleString(
                  "ko-KR",
                )}
              </div>

              <div className="mt-2 text-[10px] font-bold text-zinc-600">
                상세 · 적립내역
              </div>
            </Link>

            <ReceivedRevenueCard
              initialTotal={
                receivedDonations.totalReceived
              }
              initialCount={
                receivedDonations.count
              }
            />

            <div className="rounded-2xl border border-white/[0.08] bg-zinc-950 p-4">
              <div className="text-xs font-bold text-zinc-500">
                정산
              </div>

              <div className="mt-2 text-sm font-black text-zinc-400">
                정산 기능 준비중
              </div>
            </div>
          </div>
        </section>

        {/* CONTENT */}
        <section className="mt-8">
          <div className="mb-3">
            <h2 className="text-base font-black">
              콘텐츠
            </h2>

            <p className="mt-1 text-xs text-zinc-600">
              내가 만들고 참여하는 콘텐츠
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MenuCard
              title="콘텐츠 분석"
              description="영상과 LIVE의 조회수, 시청시간, 시청자 통계를 확인합니다."
              href="/profile/analytics"
              badge="ANALYTICS"
            />

            <MenuCard
              title="플랫라운지"
              description="가입한 라운지와 라운지 콘텐츠를 확인합니다."
              href="/lounge"
              badge="커뮤니티"
            />

            <MenuCard
              title="플핑"
              description="주문·배송·장바구니 등 쇼핑 활동을 관리합니다."
              href="/pping/mypage"
              badge="SHOP"
            />
          </div>
        </section>

        {/* FLATLIVE_PROFILE_LIVE_MANAGEMENT_V1 */}
        <section className="mt-8">
          <div className="mb-3">
            <h2 className="text-base font-black">
              LIVE 관리
            </h2>

            <p className="mt-1 text-xs text-zinc-600">
              방송 전에 채팅과 제재 설정을 관리합니다.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MenuCard
              title="채팅 관리"
              description="금지어와 욕설·비속어 자동차단을 설정합니다."
              href="/profile/live-chat"
              badge="CHAT"
            />

            <MenuCard
              title="강퇴 관리"
              description="1일·영구 강퇴 사용자를 확인하고 해제합니다."
              href="/profile/live-bans"
              badge="MODERATION"
            />

            <MenuCard
              title="팬카드 설정"
              description="일반 팬가입 메시지와 VIP 패스 이미지·메시지·가격·기간을 설정합니다."
              href="/profile/fan-card"
              badge="FAN CARD"
            />
          </div>
        </section>

        {/* ACCOUNT */}
        <section className="mt-8">
          <div className="mb-3">
            <h2 className="text-base font-black">
              내 계정
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MenuCard
              title="프로필 편집"
              description="프로필 사진, 닉네임, 소개 정보를 수정합니다."
              href="/profile/edit"
            />

            <MenuCard
              title="팔로워 · 팔로잉"
              description="팔로워와 팔로잉을 확인하고 방송 알림을 설정합니다."
              href="/profile/followers"
            />

            <MenuCard
              href="/profile/withdraw"
              title="계정 · 보안"
              description="로그인과 계정 보안 설정을 관리합니다."
            />
          </div>
        </section>

        {/* EXISTING UNIFIED ACCOUNT */}
        <section className="mt-8">
          <div className="mb-3">
            <h2 className="text-base font-black">
              서비스 계정
            </h2>
          </div>

          <UnifiedUserStatusCard
            user={{
              userId: snapshot.userId,
              username: snapshot.username,
              email: snapshot.email,
              displayName:
                snapshot.displayName,
            }}
            providers={
              snapshot.providers
            }
            serviceAccess={
              snapshot.serviceAccess
            }
          />
        </section>

        <p className="mt-5 text-xs leading-5 text-zinc-700">
          FLAT과 FIT는 법인·자산별 원장을
          분리합니다. 쇼핑·플핑·정산의 세부
          기능은 각 기능 개발 단계에서 실제
          데이터와 연결합니다.
        </p>
        {/* FLATLIVE_WITHDRAW_BUTTON */}
        <section className="mt-8 rounded-3xl border border-red-500/20 bg-zinc-950 p-5 md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-black text-white">
                회원탈퇴
              </h2>

              <p className="mt-1 text-sm leading-6 text-zinc-500">
                FLAT LIVE 서비스 이용을 종료합니다.
              </p>
            </div>

            <Link
              href="/profile/withdraw"
              className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-red-500/40 px-5 py-3 text-sm font-black text-red-400 transition hover:bg-red-500 hover:text-white"
            >
              회원탈퇴
            </Link>
          </div>
        </section>

      </div>
    </main>
  );
}
