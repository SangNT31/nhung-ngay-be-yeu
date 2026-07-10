import "../styles.css";

export const metadata = {
  title: "Khoảnh khắc của con",
  description: "Những khoảnh khắc đáng yêu của bé, được lưu giữ từ Google Drive.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f6f3ee",
};

export default function RootLayout({ children }) {
  return <html lang="vi">
    <head>
      <link rel="preconnect" href="https://www.googleapis.com" crossOrigin="anonymous" />
      <link rel="manifest" href="/manifest.webmanifest" />
      <link rel="icon" href="/assets/app-icon.svg" type="image/svg+xml" />
    </head>
    <body>{children}</body>
  </html>;
}
