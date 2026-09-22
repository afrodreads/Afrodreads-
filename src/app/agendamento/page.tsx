import { redirect } from "next/navigation";
import { WHATSAPP_LINK } from "@/lib/contact";

export default function AgendamentoPage() {
  redirect(WHATSAPP_LINK);
}
