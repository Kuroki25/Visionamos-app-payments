// Public API of @repo/ui. Consumers must only import from this entry point —
// deep imports like "@repo/ui/src/components/button" are rejected by the
// shared ESLint import-boundary rule (see docs/ARCHITECTURE.md).
export { Button } from './components/button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './components/button';

export { Badge } from './components/badge';
export type { BadgeProps, BadgeTone } from './components/badge';

export { Input } from './components/input';
export type { InputProps } from './components/input';

export { Alert } from './components/alert';
export type { AlertProps, AlertTone } from './components/alert';

export { Card, CardHeader, CardTitle, CardDescription } from './components/card';
