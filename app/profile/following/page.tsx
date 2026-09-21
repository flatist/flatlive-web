import {
  redirect,
} from "next/navigation";

export default function FollowingPage() {
  redirect(
    "/profile/followers?tab=following",
  );
}
