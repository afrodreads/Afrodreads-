import { MercadoPagoConfig, Preference, Payment, PaymentRefund } from "mercadopago";

// Instanciado sob demanda (não no carregamento do módulo) para que a
// ausência da variável de ambiente não quebre o build — que executa as
// rotas de API para coletar metadados mesmo sem as env vars de produção.
let mpClient: MercadoPagoConfig | undefined;

function getMpClient(): MercadoPagoConfig {
  if (!mpClient) {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado");
    }
    mpClient = new MercadoPagoConfig({ accessToken });
  }
  return mpClient;
}

export function getMpPreference(): Preference {
  return new Preference(getMpClient());
}

export function getMpPayment(): Payment {
  return new Payment(getMpClient());
}

/**
 * Estorna integralmente um pagamento aprovado (Refunds API do Mercado Pago).
 * `idempotencyKey` faz o Mercado Pago tratar chamadas repetidas como a mesma
 * operação, então repetir o pedido nunca gera estorno duplicado.
 */
export async function refundPayment(mpPaymentId: string, idempotencyKey?: string) {
  return new PaymentRefund(getMpClient()).total({
    payment_id: mpPaymentId,
    requestOptions: idempotencyKey ? { idempotencyKey } : undefined,
  });
}

/**
 * Estorno parcial (ex.: cancelamento tardio de quem pagou o valor total: o
 * estúdio retém o sinal e devolve o restante). A chave de idempotência faz o
 * Mercado Pago tratar repetições como a mesma operação.
 */
export async function refundPaymentPartially(mpPaymentId: string, amount: number, idempotencyKey: string) {
  return new PaymentRefund(getMpClient()).create({
    payment_id: mpPaymentId,
    body: { amount },
    requestOptions: { idempotencyKey },
  });
}

export type CreatePaymentPreferenceInput = {
  bookingId: string;
  serviceName: string;
  choice: "DEPOSIT" | "FULL";
  amount: number;
  clientName: string;
  clientEmail: string;
  /** Fim da reserva do horário: a cobrança não pode ser iniciada depois disso. */
  expiresAt: Date;
};

/**
 * Cria uma preference de Checkout Pro para cobrar o sinal ou o valor total do
 * agendamento. Pix, boleto e cartão ficam disponíveis por padrão para uma
 * Conta Negócio habilitada; o parcelamento (com juros por conta do cliente)
 * usa o limite padrão de máquina do Mercado Pago — não fixamos `installments`.
 */
export async function createPaymentPreference({
  bookingId,
  serviceName,
  choice,
  amount,
  clientName,
  clientEmail,
  expiresAt,
}: CreatePaymentPreferenceInput) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const label = choice === "FULL" ? "Pagamento total" : "Sinal";

  const result = await getMpPreference().create({
    body: {
      items: [
        {
          id: `${bookingId}-${choice.toLowerCase()}`,
          title: `${label} - ${serviceName} - Afro Dreads`,
          quantity: 1,
          currency_id: "BRL",
          unit_price: amount,
        },
      ],
      expires: true,
      expiration_date_to: expiresAt.toISOString(),
      metadata: { booking_id: bookingId, payment_choice: choice },
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
