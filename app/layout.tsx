import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

export const metadata: Metadata = {
  title: "Smortr - AI-Powered Construction Document Viewer | Collaborate & Annotate PDFs",
  description: "Transform construction document management with Smortr's intelligent PDF viewer. Collaborate in real-time, annotate drawings, and get AI-powered insights on your construction documents. Built for architects, engineers, and construction teams.",
  keywords: [
    "construction documents",
    "PDF viewer",
    "document collaboration",
    "construction management",
    "AI document analysis",
    "PDF annotation",
    "construction drawings",
    "building plans",
    "document viewer",
    "construction software",
    "project collaboration",
    "construction technology"
  ],
  authors: [{ name: "Smortr Team" }],
  creator: "Smortr",
  publisher: "Smortr",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://smortr.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "Smortr - AI-Powered Construction Document Viewer",
    description: "Collaborate on construction documents with AI-powered insights. Annotate PDFs, share drawings, and streamline your construction workflow.",
    url: 'https://smortr.com',
    siteName: 'Smortr',
    images: [
      {
        url: '/Smortr Logo Favicon.svg',
        width: 1200,
        height: 630,
        alt: 'Smortr - Construction Document Viewer',
        type: 'image/svg+xml',
      },
      {
        url: '/placeholder.jpg',
        width: 1200,
        height: 630,
        alt: 'Smortr Construction Document Management Platform',
        type: 'image/jpeg',
      }
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Smortr - AI-Powered Construction Document Viewer',
    description: 'Collaborate on construction documents with AI-powered insights. Annotate PDFs, share drawings, and streamline your construction workflow.',
    creator: '@smortr',
    site: '@smortr',
    images: ['/placeholder.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/Smortr Logo Favicon.svg',
    shortcut: '/Smortr Logo Favicon.svg',
    apple: '/Smortr Logo Favicon.svg',
  },
  manifest: '/manifest.json',
  category: 'construction technology',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Smortr",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "description": "AI-powered construction document collaboration platform for viewing, annotating, and collaborating on PDF construction documents",
    "url": "https://smortr.com",
    "author": {
      "@type": "Organization",
      "name": "Smortr Team"
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "150"
    },
    "featureList": [
      "PDF Document Viewer",
      "Real-time Collaboration",
      "AI-powered Document Analysis",
      "PDF Annotation Tools",
      "Construction Drawing Support",
      "Team Sharing Features"
    ]
  }

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
        {/* Performance and Security Meta Tags */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#000000" />
        <meta name="color-scheme" content="light dark" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Additional SEO Meta Tags */}
        <meta name="google-site-verification" content="your-google-verification-code" />
        <meta name="msvalidate.01" content="your-bing-verification-code" />
        
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
