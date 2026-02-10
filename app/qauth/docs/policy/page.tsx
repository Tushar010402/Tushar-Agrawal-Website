import { Metadata } from "next";
import PolicyClient from "./policy-client";

export const metadata: Metadata = {
  title: "Policy Engine Guide - QAuth Documentation",
  description:
    "Deep dive into QAuth's policy engine: policy documents, rules, conditions, evaluation flow, and real-world authorization patterns.",
  openGraph: {
    title: "Policy Engine Guide - QAuth Documentation",
    description: "Master QAuth's policy engine for fine-grained authorization.",
    url: "https://www.tusharagrawal.in/qauth/docs/policy",
  },
  alternates: {
    canonical: "https://www.tusharagrawal.in/qauth/docs/policy",
  },
};

export default function PolicyPage() {
  return <PolicyClient />;
}
