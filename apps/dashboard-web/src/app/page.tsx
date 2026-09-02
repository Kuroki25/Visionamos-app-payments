import { Badge, Button, Card, CardDescription, CardHeader, CardTitle } from '@repo/ui';

import { common } from '../content/es/common';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 p-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{common.appName}</CardTitle>
          <CardDescription>{common.homeTagline}</CardDescription>
        </CardHeader>
        <div className="flex items-center gap-3">
          <Button variant="secondary">Ver reportes</Button>
          <Badge tone="neutral">@repo/ui conectado</Badge>
        </div>
      </Card>
    </main>
  );
}
