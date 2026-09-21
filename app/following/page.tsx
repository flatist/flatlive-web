export default function FollowingPage() {
  return (
    <main className="min-h-screen bg-black px-4 pb-24 pt-6 text-white md:px-6 md:pt-24">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-black">팔로우</h1>
        <p className="mt-2 text-zinc-500">
          내가 팔로우한 플랫티스트의 새로운 콘텐츠가 여기에 모입니다.
        </p>

        <div className="mt-10 rounded-3xl border border-white/10 bg-zinc-950 p-10 text-center">
          <p className="text-lg font-bold">아직 팔로우한 계정이 없습니다.</p>
          <p className="mt-2 text-sm text-zinc-500">
            라이브와 숏폼에서 새로운 플랫티스트를 찾아보세요.
          </p>
        </div>
      </div>
    </main>
  );
}
