import { Badge, Button, Card, CardDescription, CardHeader, CardTitle } from '@repo/ui';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 p-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Dashboard Visionamos</CardTitle>
          <CardDescription>Panel administrativo del monorepo.</CardDescription>
        </CardHeader>
        <div className="flex items-center gap-3">
          <Button variant="secondary">Ver reportes</Button>
          <Badge tone="neutral">@repo/ui conectado</Badge>
        </div>
      </Card>
    </main>
  );
}
