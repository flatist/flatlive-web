import Link from "next/link";

const content = `플랫라이브 운영정책

본 운영정책은 플랫라이브 서비스 이용 시 회원이 준수하여야 할 세부 사항을 정합니다.
서비스 이용약관, 개인정보처리방침, 청소년보호정책과 함께 적용됩니다.

제1조 (적용 범위)
본 정책은 플랫라이브가 제공하는 모든 서비스 및 콘텐츠에 적용됩니다.

제2조 (콘텐츠 운영 원칙)
회원은 타인의 권리를 침해하거나 서비스 이용에 지장을 주는 행위를 하여서는 안 됩니다.

제3조 (제재)
약관 및 본 정책 위반 시 콘텐츠 삭제, 이용 제한 등 조치가 취해질 수 있습니다.

제4조 (정책 변경)
본 정책은 사전 공지 후 변경될 수 있습니다.

제5조 (금지 행위)
회원은 관계 법령, 본 정책 및 공서양속에 반하는 행위를 하여서는 안 되며,
타인의 권리를 침해하거나 서비스 운영을 방해하는 행위를 하여서는 안 됩니다.

제6조 (라이브 방송 운영)
회사는 서비스 운영 및 이용자 보호를 위하여
방송 콘텐츠, 채팅, 후원 기능 등에 대하여 제한 또는 조치를 할 수 있습니다.

제7조 (제재 기준)
회사는 정책 위반 행위의 정도 및 반복 여부에 따라
경고, 콘텐츠 삭제, 이용 제한 또는 영구 이용 제한 등의 조치를 할 수 있습니다.`;

export default function OperationPolicyPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="text-sm font-bold text-violet-400"
        >
          ← FLAT LIVE
        </Link>

        <div className="mt-6 rounded-3xl border border-white/10 bg-zinc-950 p-6 md:p-10">
          <div className="mb-8 border-b border-white/10 pb-5">
            <h1 className="text-2xl font-black">
              운영정책
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              시행일: 2026년 5월 22일
            </p>
          </div>

          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-zinc-300">
            {content}
          </pre>
        </div>
      </div>
    </main>
  );
}
