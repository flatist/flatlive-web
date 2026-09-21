import type {
  Metadata,
} from "next";

import {
  headers,
} from "next/headers";

import "./globals.css";

import Nav from "@/components/Nav";
import FitAwardToastBridge from "@/components/fit/FitAwardToastBridge";

import {
  AuthProvider,
} from "@/lib/auth-context";

export async function generateMetadata():
  Promise<Metadata> {
  const headerStore =
    await headers();

  const host =
    headerStore.get(
      "x-forwarded-host",
    ) ||
    headerStore.get(
      "host",
    ) ||
    "localhost:3000";

  const forwardedProto =
    headerStore.get(
      "x-forwarded-proto",
    );

  const protocol =
    forwardedProto ||
    (
      host.includes(
        "localhost",
      )
        ? "http"
        : "https"
    );

  const baseUrl =
    new URL(
      `${protocol}://${host}`,
    );

  return {
    metadataBase:
      baseUrl,

    title: {
      default:
        "FLAT LIVE",
      template:
        "%s | FLAT LIVE",
    },

    description:
      "LIVE · FLIT · VOD · Creator · PPING",

    applicationName:
      "FLAT LIVE",

    openGraph: {
      title:
        "FLAT LIVE",

      description:
        "LIVE · FLIT · VOD · Creator · PPING",

      siteName:
        "FLAT LIVE",

      type:
        "website",

      url:
        baseUrl,

      images: [
        {
          url:
            new URL(
              "/flatlive-og-v13.png",
              baseUrl,
            ).toString(),

          width:
            1200,

          height:
            630,

          alt:
            "FLAT LIVE",
        },
      ],
    },

    twitter: {
      card:
        "summary_large_image",

      title:
        "FLAT LIVE",

      description:
        "LIVE · FLIT · VOD · Creator · PPING",

      images: [
        new URL(
          "/flatlive-og-v13.png",
          baseUrl,
        ).toString(),
      ],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      // FLATLIVE_HTML_HYDRATION_EXTERNAL_ATTR_V1
      suppressHydrationWarning
    >
      <body
        // FLATLIVE_BODY_HYDRATION_EXTERNAL_ATTR_V1
        suppressHydrationWarning
        className="bg-black text-white antialiased"
      >
        <AuthProvider>
          <Nav />
          <FitAwardToastBridge />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
