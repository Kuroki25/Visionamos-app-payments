import type { ComponentType, SVGProps } from 'react';

import { nav } from '../../content/es/nav';
import { HomeIcon, PortalsIcon, SettingsIcon, TransactionsIcon, UsersIcon } from '../ui/icons';

export interface NavItem {
  id: string;
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

/**
 * Real routes for each item — only `/` (Inicio) has a page behind it today
 * (this handoff pass implements Inicio only, per
 * "REGLA FUNDAMENTAL: NO implementes las tres páginas simultáneamente").
 * The rest are real, reserved routes for the pages that come next, not
 * placeholders — clicking them 404s until their own pass lands, which is
 * the expected, honest state of an in-progress migration (see the handoff
 * analysis, "Nav → rutas").
 */
export const navItems: NavItem[] = [
  { id: 'inicio', href: '/', label: nav.items.inicio, Icon: HomeIcon },
  { id: 'transacciones', href: '/transacciones', label: nav.items.transacciones, Icon: TransactionsIcon },
  { id: 'portales', href: '/portales', label: nav.items.portales, Icon: PortalsIcon },
  { id: 'usuarios', href: '/usuarios', label: nav.items.usuarios, Icon: UsersIcon },
  { id: 'configuracion', href: '/configuracion', label: nav.items.configuracion, Icon: SettingsIcon },
];
