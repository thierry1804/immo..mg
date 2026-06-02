import type { Metadata } from "next";
import ChatPanel from "@/components/immo/ChatPanel";

export const metadata: Metadata = {
  title: "Assistant — immo·mg",
  description: "Recherche conversationnelle de biens immobiliers à Antananarivo.",
};

export default function ChatPage() {
  return <ChatPanel />;
}
