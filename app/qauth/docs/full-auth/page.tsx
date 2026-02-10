import { Metadata } from "next";
import FullAuthClient from "./full-auth-client";

export const metadata: Metadata = {
  title: "Full Auth System Guide - QAuth Documentation",
  description:
    "Build a complete authentication system with QAuth: user signup, login, sessions, database schema, protected routes, and token refresh.",
  openGraph: {
    title: "Full Auth System Guide - QAuth Documentation",
    description: "Step-by-step tutorial to build a complete auth system with QAuth.",
    url: "https://www.tusharagrawal.in/qauth/docs/full-auth",
  },
  alternates: {
    canonical: "https://www.tusharagrawal.in/qauth/docs/full-auth",
  },
};

export default function FullAuthPage() {
  return <FullAuthClient />;
}
