import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  const baseUrl = process.env.EXPO_BASE_URL ?? "";
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content="#120D1D" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Study Arc" />
        <meta name="description" content="Adaptive study planning, focus sessions and progress tracking for G.C.E. A/L students." />
        <link rel="manifest" href={`${baseUrl}/manifest.json`} />
        <link rel="icon" href={`${baseUrl}/favicon.png`} />
        <link rel="apple-touch-icon" href={`${baseUrl}/icon.png`} />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: `html,body,#root{height:100%;background:#080D14}body{margin:0;overflow:hidden}` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
