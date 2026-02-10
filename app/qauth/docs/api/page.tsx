import { Metadata } from "next";
import ApiClient from "./api-client";

export const metadata: Metadata = {
  title: "API Reference - QAuth Documentation",
  description:
    "Complete API reference for @quantumshield/qauth TypeScript SDK. All classes, methods, parameters, and types.",
  openGraph: {
    title: "API Reference - QAuth Documentation",
    description: "Complete API reference for the QAuth TypeScript SDK.",
    url: "https://www.tusharagrawal.in/qauth/docs/api",
  },
  alternates: {
    canonical: "https://www.tusharagrawal.in/qauth/docs/api",
  },
};

export default function ApiPage() {
  return <ApiClient />;
}
