'use client';

import { useState } from 'react';

import { ComingSoonCard } from '../../../components/ui/ComingSoonCard';
import { configuracionPage } from '../../../content/es/configuracion';
import { PerfilTab } from './PerfilTab';
import { RolesTab } from './RolesTab';
import { SeguridadTab } from './SeguridadTab';

type TabId = 'perfil' | 'seguridad' | 'roles' | 'notificaciones' | 'portales' | 'dashboard' | 'integraciones' | 'avanzado';

const TAB_ORDER: TabId[] = ['perfil', 'seguridad', 'roles', 'notificaciones', 'portales', 'dashboard', 'integraciones', 'avanzado'];

export function ConfigTabs({ userId, fullName, email }: { userId: string; fullName: string; email: string }) {
  const [tab, setTab] = useState<TabId>('perfil');

  return (
    <div>
      <div className="mb-5 flex gap-1.5 overflow-x-auto border-b border-(--color-border)">
        {TAB_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[13.5px] ${
              tab === id
                ? 'border-(--color-accent) font-bold text-(--color-accent)'
                : 'border-transparent font-medium text-(--color-fg-faint)'
            }`}
          >
            {configuracionPage.tabs[id]}
          </button>
        ))}
      </div>

      {tab === 'perfil' ? <PerfilTab userId={userId} initialFullName={fullName} email={email} /> : null}
      {tab === 'seguridad' ? <SeguridadTab /> : null}
      {tab === 'roles' ? <RolesTab /> : null}
      {tab === 'notificaciones' ? <ComingSoonCard message={configuracionPage.comingSoon.notificaciones} /> : null}
      {tab === 'portales' ? <ComingSoonCard message={configuracionPage.comingSoon.portales} /> : null}
      {tab === 'dashboard' ? <ComingSoonCard message={configuracionPage.comingSoon.dashboard} /> : null}
      {tab === 'integraciones' ? <ComingSoonCard message={configuracionPage.comingSoon.integraciones} /> : null}
      {tab === 'avanzado' ? <ComingSoonCard message={configuracionPage.comingSoon.avanzado} /> : null}
    </div>
  );
}
