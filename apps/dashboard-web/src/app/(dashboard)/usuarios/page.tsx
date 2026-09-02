import type { Commerce, Portal, User } from '@repo/contracts';

import { Header } from '../../../components/layout/Header';
import { usuariosPage } from '../../../content/es/usuarios';
import { UsersExplorer } from '../../../features/usuarios/components/UsersExplorer';
import { ApiError } from '../../../lib/api/errors';
import { serverApiClient } from '../../../lib/api/server';
import { buildRoleCounts, buildUserRow } from '../../../lib/users';

async function safeGet<T>(path: string, fallback: T): Promise<T> {
  try {
    return await serverApiClient.get<T>(path);
  } catch (error) {
    if (error instanceof ApiError && error.isForbidden) {
      return fallback;
    }
    throw error;
  }
}

export default async function UsuariosPage() {
  const [users, portals] = await Promise.all([safeGet<User[]>('/users', []), safeGet<Portal[]>('/portals', [])]);
  const commercesByPortal = await Promise.all(
    portals.map(async (p) => [p, await safeGet<Commerce[]>(`/portals/${p.id}/commerces`, [])] as const),
  );

  const portalsById = new Map(portals.map((p) => [p.id, p]));
  const commercesById = new Map<string, Commerce>();
  const commercesFlat: Array<Commerce & { portalName: string }> = [];
  for (const [portal, commerces] of commercesByPortal) {
    for (const commerce of commerces) {
      commercesById.set(commerce.id, commerce);
      commercesFlat.push({ ...commerce, portalName: portal.name });
    }
  }

  const roleCounts = buildRoleCounts(users);
  const rows = users.map((u) => buildUserRow(u, portalsById, commercesById));

  return (
    <>
      <Header title={usuariosPage.title} subtitle={usuariosPage.subtitle} />
      <div className="px-9 pb-10 pt-1">
        <UsersExplorer roleCounts={roleCounts} rows={rows} portals={portals} commerces={commercesFlat} />
      </div>
    </>
  );
}
