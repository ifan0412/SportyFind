import type { Metadata } from "next";
import { FeedbackForm } from "@/components/feedback/FeedbackForm";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `意見回饋 | ${SITE.name}`,
  description: `向 ${SITE.name} 提交意見回饋、查詢或舉報。`,
};

export default function FeedbackPage() {
  return <FeedbackForm />;
}
