import type { Metadata } from "next";
import { BookingFlow } from "@/components/booking/BookingFlow";

export const metadata: Metadata = {
  title: "Agendar Horário | Afro Dreads",
  description:
    "Agende online seu horário de formação, manutenção ou revitalização de dreadlocks e microlocs na Afro Dreads.",
  alternates: { canonical: "/agendamento" },
};

export default function AgendamentoPage() {
  return <BookingFlow />;
}
