import { Metadata } from "next";
import DocsClient from "./docs-client";

export const metadata: Metadata = {
  title: "Getting Started - QAuth Documentation",
  description:
    "Install and start using QAuth, the post-quantum authentication protocol. Quick start guide, core concepts, and token lifecycle.",
  openGraph: {
    title: "Getting Started - QAuth Documentation",
    description: "Install and start using QAuth in 5 minutes.",
    url: "https://www.tusharagrawal.in/qauth/docs",
  },
  alternates: {
    canonical: "https://www.tusharagrawal.in/qauth/docs",
  },
};

export default function DocsPage() {
  return <DocsClient />;
}
