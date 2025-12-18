"use client";
import { useState } from "react";
import { Button } from "@/components/ui/moving-border";

export const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    try {
      // For now, we'll simulate sending the form
      // You can later integrate with an API endpoint or email service
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log("Form submitted:", formData);

      setStatus("success");
      setFormData({ name: "", email: "", message: "" });

      // Reset success message after 3 seconds
      setTimeout(() => setStatus("idle"), 3000);
    } catch (error) {
      setStatus("error");
      setErrorMessage("Failed to send message. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-neutral-300 mb-2">
          Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="w-full px-4 py-3 bg-neutral-900/80 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          placeholder="Your name"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-2">
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          className="w-full px-4 py-3 bg-neutral-900/80 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          placeholder="your.email@example.com"
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-neutral-300 mb-2">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          required
          rows={6}
          className="w-full px-4 py-3 bg-neutral-900/80 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
          placeholder="Your message..."
        />
      </div>

      <div aria-live="polite" aria-atomic="true">
        {status === "success" && (
          <div className="p-4 bg-green-500/10 border border-green-500/50 rounded-lg text-green-400 text-center" role="status">
            Message sent successfully! I'll get back to you soon.
          </div>
        )}

        {status === "error" && (
          <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-center" role="alert">
            {errorMessage}
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <Button
          borderRadius="1.75rem"
          className="bg-gradient-to-r from-blue-600 to-blue-500 text-white border-blue-500 px-10 py-4 hover:from-blue-500 hover:to-blue-400"
          type="submit"
          disabled={status === "sending"}
        >
          <span className="flex items-center gap-2 font-semibold">
            {status === "sending" ? "Sending..." : "Send Message"}
            {status !== "sending" && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            )}
          </span>
        </Button>
      </div>
    </form>
  );
};
