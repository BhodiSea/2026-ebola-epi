import { Suspense } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page({
  searchParams,
}: Readonly<{ searchParams: Promise<{ error: string }> }>) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Sorry, something went wrong.</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense>
                <ErrorContent searchParams={searchParams} />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

async function ErrorContent({
  searchParams,
}: Readonly<{ searchParams: Promise<{ error: string }> }>) {
  const params = await searchParams;

  return (
    <>
      {params.error ? (
        <p className="text-muted-foreground text-sm">Code error: {params.error}</p>
      ) : (
        <p className="text-muted-foreground text-sm">An unspecified error occurred.</p>
      )}
    </>
  );
}
