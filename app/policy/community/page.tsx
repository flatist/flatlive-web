import Link from "next/link";

const content = `플랫라이브 커뮤니티 가이드라인

플랫라이브는 라이브 방송, FLIT, VOD, 채팅 및 커뮤니티 활동에서
안전하고 존중받는 이용 환경을 지향합니다.

제1조 (기본 원칙)
이용자는 다른 이용자의 권리와 안전을 존중해야 하며,
관련 법령과 서비스 이용약관 및 운영정책을 준수해야 합니다.

제2조 (금지 콘텐츠 및 행위)
다음 콘텐츠 또는 행위는 제한될 수 있습니다.
1. 불법촬영물 및 불법 성적 콘텐츠
2. 아동·청소년 학대 또는 성착취 콘텐츠
3. 폭력, 범죄, 마약, 도박을 조장하는 콘텐츠
4. 타인에 대한 협박, 괴롭힘, 혐오 또는 지속적인 모욕
5. 개인정보 또는 사생활을 무단 공개하는 행위
6. 저작권, 초상권, 상표권 등 타인의 권리를 침해하는 행위
7. 사칭, 계정 도용 및 허위 신분 표시
8. 서비스 운영을 방해하거나 시스템을 악용하는 행위
9. 외부 불법 거래 또는 비정상 결제를 유도하는 행위

제3조 (성인 콘텐츠)
1. 성인 대상 콘텐츠는 반드시 19+로 표시해야 합니다.
2. 19+ 표시를 했더라도 불법적인 성적 콘텐츠가 허용되는 것은 아닙니다.
3. 성인 콘텐츠는 성인 인증이 완료된 이용자만 시청할 수 있습니다.

제4조 (라이브 방송)
다음 방송은 제한될 수 있습니다.
1. 운전 중 방송
2. 위험한 행위를 직접 수행하거나 조장하는 방송
3. 민감 시설 또는 촬영이 제한된 장소의 무단 방송
4. 타인의 얼굴, 개인정보 또는 사생활을 침해하는 방송

제5조 (채팅 및 이용자 간 상호작용)
욕설, 괴롭힘, 도배, 스팸, 협박 및 타인에 대한 지속적인 공격 행위는 제한될 수 있습니다.

제6조 (AI 콘텐츠)
AI로 생성하거나 실질적으로 변형한 콘텐츠는
서비스 정책에 따라 AI 콘텐츠임을 표시해야 합니다.
타인을 사칭하거나 권리를 침해하는 딥페이크 콘텐츠는 금지됩니다.

제7조 (신고)
이용자는 서비스 내 신고 기능 또는 권리침해 신고센터를 통해
정책 위반 콘텐츠를 신고할 수 있습니다.

제8조 (제재)
위반 정도와 반복 여부에 따라 다음 조치가 적용될 수 있습니다.
1. 경고
2. 콘텐츠 비노출 또는 삭제
3. 라이브 방송 중단
4. 채팅 또는 업로드 기능 제한
5. 수익 제한
6. 계정 일시 정지
7. 계정 영구 제한

회사는 자동화된 시스템과 운영자의 검토를 함께 활용할 수 있습니다.`;

export default function CommunityPolicyPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-bold text-flat-yellow">
          ← FLAT LIVE
        </Link>

        <div className="mt-6 rounded-3xl border border-white/10 bg-zinc-950 p-6 md:p-10">
          <div className="mb-8 border-b border-white/10 pb-5">
            <h1 className="text-2xl font-black">
              커뮤니티 가이드라인
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              FLAT LIVE Community Guidelines
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
