import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

if (!accessToken) {
  throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado");
}

export const mpClient = new MercadoPagoConfig({ accessToken });

export const mpPreference = new Preference(mpClient);
export const mpPayment = new Payment(mpClient);

export type CreateDepositPreferenceInput = {
  bookingId: string;
  serviceName: string;
  depositAmount: number;
  clientName: string;
  clientEmail: string;
};

/**
 * Cria uma preference de Checkout Pro para cobrar o sinal do agendamento.
 * Pix, boleto e cartão ficam disponíveis por padrão para uma Conta Negócio
 * habilitada; o parcelamento (com juros por conta do cliente) usa o limite
 * padrão de máquina do Mercado Pago — não fixamos `installments` aqui.
 */
export async function createDepositPreference({
  bookingId,
  serviceName,
  depositAmount,
  clientName,
  clientEmail,
}: CreateDepositPreferenceInput) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const result = await mpPreference.create({
    body: {
      items: [
        {
          id: bookingId,
          title: `Sinal - ${serviceName} - Afro Dreads`,
          quantity: 1,
          currency_id: "BRL",
          unit_price: depositAmount,
        },
      ],
      payer: {
        name: clientName,
        email: clientEmail,
      },
      external_reference: bookingId,
      notification_url: `${siteUrl}/api/mercadopago/webhook`,
      back_urls: {
        success: `${siteUrl}/agendamento/${bookingId}/sucesso`,
        pending: `${siteUrl}/agendamento/${bookingId}/pendente`,
        failure: `${siteUrl}/agendamento/${bookingId}/erro`,
      },
      auto_return: "approved",
      statement_descriptor: "AFRODREADS",
    },
  });

  return result;
}
