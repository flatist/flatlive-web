"use client";

type ConsentStatusResponse = {
  success?: boolean;
  loggedIn?: boolean;
  accepted?: boolean;
  error?: string;
  traceId?: string;
};

type ConsentSaveResponse = {
  success?: boolean;
  accepted?: boolean;
  error?: string;
  traceId?: string;
};

function openConsentDialog(): Promise<boolean> {
  return new Promise((resolve) => {
    const existing =
      document.getElementById(
        "flatlive-creator-consent-overlay",
      );

    if (existing) {
      existing.remove();
    }

    const overlay =
      document.createElement("div");

    overlay.id =
      "flatlive-creator-consent-overlay";

    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.zIndex = "999999";
    overlay.style.background =
      "rgba(0,0,0,0.82)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent =
      "center";
    overlay.style.padding = "20px";

    const panel =
      document.createElement("div");

    panel.style.width = "100%";
    panel.style.maxWidth = "520px";
    panel.style.maxHeight = "85vh";
    panel.style.overflowY = "auto";
    panel.style.border =
      "1px solid rgba(255,255,255,0.12)";
    panel.style.borderRadius = "24px";
    panel.style.background = "#111";
    panel.style.color = "#fff";
    panel.style.padding = "24px";
    panel.style.boxShadow =
      "0 30px 80px rgba(0,0,0,0.5)";

    panel.innerHTML = `
      <div style="font-size:12px;font-weight:800;color:#facc15;">
        FLAT LIVE CREATOR
      </div>

      <h2 style="margin:8px 0 0;font-size:22px;font-weight:900;">
        크리에이터 정책 동의
      </h2>

      <p style="margin:10px 0 20px;font-size:13px;line-height:1.7;color:#a1a1aa;">
        LIVE 방송, FLIT 또는 VOD를 처음 제작하기 전에
        콘텐츠 제작자의 책임 및 음원 사용 정책을 확인해주세요.
        최초 1회만 동의하면 됩니다.
      </p>

      <div style="padding:16px;border:1px solid rgba(255,255,255,0.08);border-radius:16px;background:#090909;">
        <label style="display:flex;gap:10px;align-items:flex-start;cursor:pointer;">
          <input
            id="flatlive-creator-policy-checkbox"
            type="checkbox"
            style="margin-top:3px;width:16px;height:16px;"
          />

          <span style="font-size:13px;line-height:1.7;color:#d4d4d8;">
            <b style="color:#facc15;">[필수]</b>
            콘텐츠 제작·업로드 책임에 동의합니다.
            타인의 저작권·초상권·개인정보를 침해하지 않고,
            불법·유해 콘텐츠를 게시하지 않으며,
            AI 생성 콘텐츠 및 19+ 콘텐츠를 정책에 맞게 표시하겠습니다.
          </span>
        </label>
      </div>

      <div style="margin-top:12px;padding:16px;border:1px solid rgba(255,255,255,0.08);border-radius:16px;background:#090909;">
        <label style="display:flex;gap:10px;align-items:flex-start;cursor:pointer;">
          <input
            id="flatlive-music-policy-checkbox"
            type="checkbox"
            style="margin-top:3px;width:16px;height:16px;"
          />

          <span style="font-size:13px;line-height:1.7;color:#d4d4d8;">
            <b style="color:#facc15;">[필수]</b>
            저작권·음원 IP 정책을 확인했습니다.
            플랫폼 보증 음원 또는 적법한 이용 권리를 가진 음원만
            사용하며, 권리 침해 시 콘텐츠·수익·계정이 제한될 수
            있음을 확인합니다.
          </span>
        </label>
      </div>

      <div style="display:flex;flex-wrap:wrap;gap:14px;margin-top:16px;">
        <a
          href="/policy/operation"
          target="_blank"
          style="font-size:12px;font-weight:800;color:#c4b5fd;text-decoration:none;"
        >
          운영정책 보기
        </a>

        <a
          href="/policy/community"
          target="_blank"
          style="font-size:12px;font-weight:800;color:#c4b5fd;text-decoration:none;"
        >
          커뮤니티 가이드라인 보기
        </a>

        <a
          href="/policy/copyright"
          target="_blank"
          style="font-size:12px;font-weight:800;color:#c4b5fd;text-decoration:none;"
        >
          저작권·음원정책 보기
        </a>

        <a
          href="/policy/ai"
          target="_blank"
          style="font-size:12px;font-weight:800;color:#c4b5fd;text-decoration:none;"
        >
          AI 콘텐츠 정책 보기
        </a>
      </div>

      <div
        id="flatlive-creator-consent-error"
        style="display:none;margin-top:16px;padding:12px;border-radius:12px;background:rgba(239,68,68,0.12);color:#fca5a5;font-size:12px;line-height:1.6;"
      ></div>

      <div style="display:flex;gap:10px;margin-top:22px;">
        <button
          id="flatlive-creator-consent-cancel"
          type="button"
          style="flex:1;border:1px solid #3f3f46;border-radius:14px;background:#18181b;color:#fff;padding:13px;font-weight:800;cursor:pointer;"
        >
          취소
        </button>

        <button
          id="flatlive-creator-consent-confirm"
          type="button"
          style="flex:2;border:0;border-radius:14px;background:#facc15;color:#000;padding:13px;font-weight:900;cursor:pointer;"
        >
          동의하고 계속
        </button>
      </div>
    `;

    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    const creatorCheckbox =
      panel.querySelector<HTMLInputElement>(
        "#flatlive-creator-policy-checkbox",
      );

    const musicCheckbox =
      panel.querySelector<HTMLInputElement>(
        "#flatlive-music-policy-checkbox",
      );

    const confirmButton =
      panel.querySelector<HTMLButtonElement>(
        "#flatlive-creator-consent-confirm",
      );

    const cancelButton =
      panel.querySelector<HTMLButtonElement>(
        "#flatlive-creator-consent-cancel",
      );

    const errorBox =
      panel.querySelector<HTMLDivElement>(
        "#flatlive-creator-consent-error",
      );

    const finish = (
      result: boolean,
    ) => {
      overlay.remove();
      resolve(result);
    };

    cancelButton?.addEventListener(
      "click",
      () => {
        finish(false);
      },
    );

    confirmButton?.addEventListener(
      "click",
      async () => {
        if (
          !creatorCheckbox?.checked ||
          !musicCheckbox?.checked
        ) {
          if (errorBox) {
            errorBox.style.display =
              "block";

            errorBox.textContent =
              "필수 정책 2개에 모두 동의해주세요.";
          }

          return;
        }

        if (confirmButton) {
          confirmButton.disabled =
            true;

          confirmButton.textContent =
            "저장 중...";
        }

        if (errorBox) {
          errorBox.style.display =
            "none";
        }

        try {
          const response =
            await fetch(
              "/api/creator/consent",
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                credentials:
                  "include",
                body: JSON.stringify({
                  creatorAccepted:
                    true,
                  musicAccepted:
                    true,
                }),
              },
            );

          const data =
            (await response.json()) as ConsentSaveResponse;

          if (
            !response.ok ||
            !data.success ||
            !data.accepted
          ) {
            if (errorBox) {
              errorBox.style.display =
                "block";

              errorBox.textContent =
                data.error ||
                "동의를 저장하지 못했습니다.";
            }

            if (confirmButton) {
              confirmButton.disabled =
                false;

              confirmButton.textContent =
                "동의하고 계속";
            }

            return;
          }

          finish(true);
        } catch {
          if (errorBox) {
            errorBox.style.display =
              "block";

            errorBox.textContent =
              "네트워크 오류가 발생했습니다.";
          }

          if (confirmButton) {
            confirmButton.disabled =
              false;

            confirmButton.textContent =
              "동의하고 계속";
          }
        }
      },
    );
  });
}

export async function ensureCreatorConsent(): Promise<boolean> {
  try {
    const response =
      await fetch(
        "/api/creator/consent",
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        },
      );

    const data =
      (await response.json()) as ConsentStatusResponse;

    if (
      data.loggedIn === false
    ) {
      window.location.href =
        "/login";

      return false;
    }

    if (
      response.ok &&
      data.success &&
      data.accepted
    ) {
      return true;
    }

    if (
      !response.ok ||
      !data.success
    ) {
      window.alert(
        data.error ||
          "크리에이터 동의 상태를 확인하지 못했습니다.",
      );

      return false;
    }

    return openConsentDialog();
  } catch {
    window.alert(
      "크리에이터 동의 상태 확인 중 네트워크 오류가 발생했습니다.",
    );

    return false;
  }
}
