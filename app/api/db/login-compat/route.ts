import { NextResponse } from "next/server";

import {
  LocalUserRepository,
} from "@/lib/repositories/local-user-repository";

import {
  DatabaseUserRepository,
} from "@/lib/repositories/database-user-repository";

export async function GET() {
  try {
    const localRepo =
      new LocalUserRepository();

    const dbRepo =
      new DatabaseUserRepository();

    const localUsers =
      await localRepo.findAll();

    const mismatches: string[] = [];

    for (const localUser of localUsers) {
      const dbUser =
        await dbRepo.findById(
          localUser.id,
        );

      if (!dbUser) {
        mismatches.push(
          `${localUser.id}:DB_MISSING`,
        );
        continue;
      }

      if (
        localUser.username !==
        dbUser.username
      ) {
        mismatches.push(
          `${localUser.id}:USERNAME`,
        );
      }

      if (
        localUser.email !==
        dbUser.email
      ) {
        mismatches.push(
          `${localUser.id}:EMAIL`,
        );
      }

      if (
        localUser.displayName !==
        dbUser.displayName
      ) {
        mismatches.push(
          `${localUser.id}:DISPLAY_NAME`,
        );
      }

      if (
        localUser.passwordHash !==
        dbUser.passwordHash
      ) {
        mismatches.push(
          `${localUser.id}:PASSWORD_HASH`,
        );
      }
    }

    return NextResponse.json({
      success: true,
      checkedUsers:
        localUsers.length,
      loginCompatible:
        mismatches.length === 0,
      mismatchCount:
        mismatches.length,
      mismatches,
    });
  } catch (error) {
    console.error(
      "[DB_LOGIN_COMPAT_ERROR]",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "DB_LOGIN_COMPAT_FAILED",
      },
      {
        status: 500,
      },
    );
  }
}
