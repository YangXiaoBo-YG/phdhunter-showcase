import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: 'PhDHunter - 浙江博士求职推荐平台',
    template: '%s | PhDHunter',
  },
  description: '面向博士求职者的浙江省岗位推荐网站，AI个性化推荐，编制类型一目了然，高校+事业单位+央国企一站聚合',
  keywords: ['博士求职', '浙江高校招聘', '事业编制', 'AI推荐', '博士后', '教职招聘'],
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-background text-foreground flex flex-col">
        <Navbar />
        <main className="flex-1" style={{ position: 'relative', zIndex: 1 }}>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
