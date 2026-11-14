/**
 * FLATLIVE 인증 화면 공용 스타일 토큰.
 *
 * 로그인 / 회원가입 / 비밀번호 찾기 / 비밀번호 재설정 화면이
 * 같은 톤앤매너(옐로 #f6c900 + 블랙)를 유지하도록 클래스를 한곳에서 관리한다.
 * 색상 자체는 app/globals.css 의 --color-flat-* 토큰에서 온다.
 */

/**
 * 페이지 루트. 상단 글로우를 위해 relative/overflow-hidden 포함.
 * pb-24: 모바일 하단 고정 네비에 콘텐츠가 가리지 않도록 (앱 전역 규칙).
 * md:pt-24: 데스크톱 상단 고정 헤더(h-16) 아래로 내리기 위해.
 */
export const authMainClass =
  "relative min-h-screen overflow-hidden bg-flat-black px-4 pb-24 pt-10 text-white md:px-6 md:pb-20 md:pt-24";

/** 카드 뒤 은은한 브랜드 글로우. aria-hidden 으로 렌더한다. */
export const authGlowClass =
  "pointer-events-none absolute left-1/2 top-0 h-72 w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-flat-yellow/10 blur-[120px]";

export const authCardClass =
  "rounded-[28px] border border-white/[0.08] bg-flat-surface p-6 shadow-2xl shadow-black/50 md:p-8";

/** 워드마크 위 작은 아이브로우 (예: SIGN IN). */
export const authEyebrowClass =
  "mb-3 text-[10px] font-black tracking-[0.3em] text-flat-yellow";

export const authWordmarkClass = "inline-block text-2xl font-black tracking-tight";

export const authSubtitleClass = "mt-2 text-sm text-zinc-400";

export const authLabelClass = "mb-2 block text-xs font-black tracking-wide text-zinc-400";

export const authInputClass =
  "w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-sm font-medium text-white placeholder:text-zinc-600 outline-none transition focus:border-flat-yellow focus:ring-2 focus:ring-flat-yellow/20";

export const authCheckboxClass =
  "mt-0.5 h-4 w-4 shrink-0 rounded-sm border-zinc-700 bg-black accent-flat-yellow";

/** 옐로 CTA. 앱 전역 CTA 패턴(옐로 배경 + 블랙 볼드)과 동일. */
export const authButtonClass =
  "w-full rounded-2xl bg-flat-yellow px-4 py-4 text-sm font-black text-black transition hover:bg-flat-yellow-soft disabled:cursor-not-allowed disabled:opacity-40";

/** 버튼과 같은 모양의 링크형 CTA. */
export const authButtonLinkClass = `${authButtonClass} block text-center`;

export const authLinkClass =
  "font-black text-flat-yellow transition hover:text-flat-yellow-soft";

export const authMutedLinkClass =
  "text-xs text-zinc-500 transition hover:text-flat-yellow";

export const authErrorClass =
  "rounded-2xl border border-rose-500/30 bg-rose-500/[0.07] px-4 py-3 text-sm font-bold text-rose-300";

export const authSuccessClass =
  "rounded-2xl border border-flat-yellow/30 bg-flat-yellow/[0.07] px-4 py-3";
