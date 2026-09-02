import { Header } from '../../../components/layout/Header';
import { configuracionPage } from '../../../content/es/configuracion';
import { ConfigTabs } from '../../../features/configuracion/components/ConfigTabs';
import { getCurrentUser } from '../../../lib/auth/session.server';

export default async function ConfiguracionPage() {
  // The `(dashboard)` layout already guarantees a session for every page
  // under it — this fetches it again only to read fullName/email/id for
  // the Perfil tab, not to re-check authentication.
  const user = await getCurrentUser();

  return (
    <>
      <Header title={configuracionPage.title} subtitle={configuracionPage.subtitle} />
      <div className="px-9 pb-10 pt-1">
        {user ? <ConfigTabs userId={user.id} fullName={user.fullName} email={user.email} /> : null}
      </div>
    </>
  );
}
