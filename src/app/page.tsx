import type { Metadata } from "next";
import { siteDescription, siteTitle, siteUrl } from "@/lib/site";
import OverviewPage from "./overview";

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  alternates: { canonical: siteUrl },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Onismith",
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: "/brand/social-card.png",
        width: 1200,
        height: 630,
        alt: "Onismith, an Oxygen Not Included save editor",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: {
      url: "/brand/social-card.png",
      alt: "Onismith, an Oxygen Not Included save editor",
    },
  },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Onismith",
            url: siteUrl,
          }),
        }}
      />
      <OverviewPage />
    </>
  );
}
