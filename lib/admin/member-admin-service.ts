import { HybridUserRepository } from "@/lib/repositories/hybrid-user-repository";
import { getUserRole } from "@/lib/auth/role-store";

export type AdminMemberSummary = {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
  updatedAt: string;
};

export class MemberAdminService {
  private userRepository = new HybridUserRepository();

  async listMembers(query?: string): Promise<AdminMemberSummary[]> {
    const users = await this.userRepository.findAll();

    const normalizedQuery = query?.trim().toLowerCase() ?? "";

    const filtered = normalizedQuery
      ? users.filter((user) => {
          return (
            user.id.toLowerCase().includes(normalizedQuery) ||
            user.username.toLowerCase().includes(normalizedQuery) ||
            user.email.toLowerCase().includes(normalizedQuery) ||
            user.displayName.toLowerCase().includes(normalizedQuery)
          );
        })
      : users;

    const result = await Promise.all(
      filtered.map(async (user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        role: await getUserRole(user.id),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
    );

    return result.sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }
}
