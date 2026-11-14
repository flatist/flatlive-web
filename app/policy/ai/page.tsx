import Link from "next/link";

const content = `플랫라이브 AI 콘텐츠 정책

제1조 (목적)
본 정책은 인공지능을 이용하여 생성 또는 변형된 콘텐츠의
투명성과 이용자 안전을 확보하기 위한 기준을 정합니다.

제2조 (AI 콘텐츠)
다음 콘텐츠는 AI 콘텐츠로 분류될 수 있습니다.
1. AI가 생성한 영상, 이미지, 음성 또는 텍스트
2. 실제 인물의 외모 또는 음성을 AI로 실질적으로 변형한 콘텐츠
3. 실제 사건이나 장소를 사실처럼 보이도록 합성한 콘텐츠

제3조 (표시 의무)
AI로 생성하거나 실질적으로 변형한 콘텐츠는
서비스에서 제공하는 AI 콘텐츠 표시 기능을 이용하여 명확하게 표시해야 합니다.

제4조 (금지 행위)
다음 AI 콘텐츠는 금지됩니다.
1. 타인을 사칭하거나 신원을 오인하게 하는 악의적 딥페이크
2. 타인의 명예, 초상권, 개인정보 또는 저작권을 침해하는 콘텐츠
3. 불법촬영물 또는 불법적인 성적 합성물
4. 아동·청소년을 대상으로 한 성적 합성 콘텐츠
5. 범죄, 사기 또는 허위 거래를 목적으로 제작된 콘텐츠
6. AI 생성 사실을 의도적으로 숨겨 이용자를 기만하는 행위

제5조 (검토 및 표시)
회사는 이용자의 자율 표시, 자동화된 시스템 및 운영자의 검토를 통해
AI 콘텐츠 여부를 판단하거나 추가 표시를 적용할 수 있습니다.

자동화된 탐지 결과만을 근거로 중대한 제재를 확정하지 않고,
필요한 경우 운영자의 검토를 병행할 수 있습니다.

제6조 (제재)
정책 위반 콘텐츠는 다음 조치의 대상이 될 수 있습니다.
1. AI 표시 강제 적용
2. 추천 또는 노출 제한
3. 콘텐츠 삭제
4. 수익 제한
5. 계정 이용 제한

제7조 (이의 제기)
이용자는 잘못된 표시 또는 제재라고 판단하는 경우
회사가 제공하는 신고 또는 이의 제기 절차를 이용할 수 있습니다.

제8조 (정책 변경)
본 정책은 기술 환경, 관련 법령 및 서비스 운영 기준에 따라 변경될 수 있습니다.`;

export default function AiPolicyPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-bold text-flat-yellow">
          ← FLAT LIVE
        </Link>

        <div className="mt-6 rounded-3xl border border-white/10 bg-zinc-950 p-6 md:p-10">
          <div className="mb-8 border-b border-white/10 pb-5">
            <h1 className="text-2xl font-black">
              AI 콘텐츠 정책
            </h1>
          </div>

          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-zinc-300">
            {content}
          </pre>
        </div>
      </div>
    </main>
  );
}
