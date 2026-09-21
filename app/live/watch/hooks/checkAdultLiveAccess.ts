export type AdultLiveAccessState =
  | "checking"
  | "allowed"
  | "login-required"
  | "verification-required"
  | "error";

type Params = {
  roomId: string;
  setAdultLiveAccess: (
    value: AdultLiveAccessState,
  ) => void;
  setLiveIsAdult: (
    value: boolean,
  ) => void;
};

/**
 * FLATLIVE_ADULT_LIVE_ACCESS_REFACTOR_V3
 */
export async function checkAdultLiveAccess({
  roomId,
  setAdultLiveAccess,
  setLiveIsAdult,
}: Params) {
  try {
    setAdultLiveAccess("checking");

    const roomResponse =
      await fetch(
        `/api/live/signal?roomId=${encodeURIComponent(
          roomId,
        )}`,
        {
          cache: "no-store",
        },
      );

    if (!roomResponse.ok) {
      setAdultLiveAccess("error");
      return false;
    }

    const roomData =
      await roomResponse.json();

    const adult =
      roomData.isAdult === true;

    setLiveIsAdult(adult);

    if (!adult) {
      setAdultLiveAccess("allowed");
      return true;
    }

    const adultResponse =
      await fetch(
        "/api/adult/status",
        {
          cache: "no-store",
        },
      );

    if (!adultResponse.ok) {
      setAdultLiveAccess("error");
      return false;
    }

    const adultData =
      await adultResponse.json();

    if (adultData.loggedIn !== true) {
      setAdultLiveAccess(
        "login-required",
      );
      return false;
    }

    if (adultData.verified !== true) {
      setAdultLiveAccess(
        "verification-required",
      );
      return false;
    }

    setAdultLiveAccess("allowed");
    return true;
  } catch (error) {
    console.error(
      "ADULT LIVE ACCESS CHECK FAILED:",
      error,
    );

    setAdultLiveAccess("error");
    return false;
  }
}
