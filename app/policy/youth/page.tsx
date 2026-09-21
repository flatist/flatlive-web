import Link from "next/link";

const content = `플랫라이브 청소년보호정책

제1조 (목적)
본 청소년보호정책은 플랫라이브가 관련 법령을 준수하여
청소년을 유해한 콘텐츠로부터 보호하고 건전한 서비스 이용 환경을 조성함을 목적으로 합니다.

제2조 (적용 대상)
본 정책은 플랫라이브가 제공하는 모든 서비스 및 콘텐츠 이용에 적용됩니다.

제3조 (청소년 보호 기본 원칙)
회사는 청소년의 권익 보호를 중요하게 여기며,
유해 콘텐츠로부터 청소년을 보호하기 위한 조치를 시행합니다.

제4조 (서비스 이용 및 연령 제한)
1. 회원가입은 만 18세 이상 이용자만 가능합니다.
2. 라이브 방송 송출, 상품 판매, 후원 수령 등 수익 창출 활동은 만 19세 이상만 가능합니다.
3. 성인 콘텐츠는 성인 인증이 완료된 이용자만 시청할 수 있습니다.
4. 회사는 필요한 경우 연령 확인 및 본인 인증 절차를 요구할 수 있습니다.

제5조 (유해 콘텐츠 기준)
다음 콘텐츠는 제한 또는 삭제될 수 있습니다.
1. 고수위 폭력 및 잔인한 콘텐츠
2. 아동·청소년 학대 또는 착취 콘텐츠
3. 불법적인 성적 콘텐츠 및 음란 콘텐츠
4. 범죄·마약·도박을 조장하는 콘텐츠
5. 혐오·괴롭힘·언어폭력 콘텐츠
6. 기타 청소년 보호가 필요하다고 판단되는 콘텐츠

제6조 (유해 콘텐츠 조치)
회사는 위반 콘텐츠에 대해 다음 조치를 할 수 있습니다.
1. 콘텐츠 비노출 또는 삭제
2. 라이브 방송 즉시 중단
3. 서비스 이용 제한
4. 계정 일시 또는 영구 제한
5. 필요한 경우 관계기관 협조

제7조 (청소년 보호 조치)
회사는 다음 보호 조치를 운영할 수 있습니다.
1. 연령 제한
2. 본인 및 성인 인증
3. 신고 시스템
4. 운영자 모니터링
5. 자동화된 유해 콘텐츠 탐지 시스템

자동화된 탐지 결과는 운영 판단의 참고 자료로 활용될 수 있습니다.

제8조 (신고 및 상담)
이용자는 청소년 유해 콘텐츠를 신고할 수 있습니다.
신고 내용은 검토 및 조치 목적으로 활용될 수 있으며,
관련 법령에 따라 필요한 기간 동안 보관될 수 있습니다.

제9조 (청소년 보호책임자)
담당부서: 청소년보호 담당부서
직책: 이사
담당자: 함동진
이메일: flatist1004@naver.com

제10조 (정책 변경)
본 정책은 관련 법령 또는 서비스 정책 변경에 따라 수정될 수 있으며,
중요한 변경 사항은 서비스 내 공지를 통해 안내합니다.`;

export default function YouthPolicyPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-bold text-violet-400">
          ← FLAT LIVE
        </Link>

        <div className="mt-6 rounded-3xl border border-white/10 bg-zinc-950 p-6 md:p-10">
          <div className="mb-8 border-b border-white/10 pb-5">
            <h1 className="text-2xl font-black">청소년보호정책</h1>
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
