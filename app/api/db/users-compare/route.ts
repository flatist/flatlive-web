import { NextResponse } from "next/server";

import {
  LocalUserRepository,
} from "@/lib/repositories/local-user-repository";
import {
  DatabaseUserRepository,
} from "@/lib/repositories/database-user-repository";

export async function GET() {
  try {
    const localRepository =
      new LocalUserRepository();

    const databaseRepository =
      new DatabaseUserRepository();

    const localUsers =
      await localRepository.findAll();

    const databaseUsers =
      await databaseRepository.findAll();

    const localIds =
      new Set(
        localUsers.map(
          (user) => user.id,
        ),
      );

    const databaseIds =
      new Set(
        databaseUsers.map(
          (user) => user.id,
        ),
      );

    const missingInDatabase =
      localUsers
        .filter(
          (user) =>
            !databaseIds.has(
              user.id,
            ),
        )
        .map(
          (user) => user.id,
        );

    const extraInDatabase =
      databaseUsers
        .filter(
          (user) =>
            !localIds.has(
              user.id,
            ),
        )
        .map(
          (user) => user.id,
        );

    return NextResponse.json({
      success: true,
      localCount:
        localUsers.length,
      databaseCount:
        databaseUsers.length,
      idsMatch:
        missingInDatabase.length === 0 &&
        extraInDatabase.length === 0,
      missingInDatabase,
      extraInDatabase,
    });
  } catch (error) {
    console.error(
      "[DB_USERS_COMPARE_ERROR]",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "DB_USERS_COMPARE_FAILED",
      },
      {
        status: 500,
      },
    );
  }
}
