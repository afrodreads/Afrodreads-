// Remove dados sensíveis do texto do cliente ANTES de mandar ao modelo.
//
// O cliente pode escrever CPF, cartão, dados bancários, senha ou um token na
// conversa. A mensagem original fica guardada (Message), mas o modelo nunca
// recebe esses valores: ele só precisa saber que "um dado foi omitido".
// Datas, horários e valores curtos ("R$ 400", "10h", "07/10") passam.

const OMITTED = "[dado omitido]";

const PATTERNS: RegExp[] = [
  // Credenciais e tokens
  /(senha|password|pass|token|api[_-]?key|secret)\s*[:=]\s*\S+/gi,
  /\bsk-[A-Za-z0-9_-]{6,}/g,
  /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi,
  // E-mail
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
  // Chave Pix aleatória (UUID)
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
  // CNPJ e CPF (com ou sem pontuação)
  /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g,
  /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g,
  // Cartão (13 a 19 dígitos, com espaços ou hífens)
  /\b(?:\d[ -]?){12,18}\d\b/g,
  // Agência / conta
  /\b(ag[eê]ncia|ag|conta(?:\s+corrente)?|cc)\s*[:.]?\s*\d[\d.-]{2,}/gi,
  // Qualquer outra sequência longa de dígitos (telefone, documento, conta)
  /\b\d[\d\s.-]{7,}\d\b/g,
  // Cadeias longas parecidas com chaves/tokens
  /\b[A-Za-z0-9_-]{32,}\b/g,
];

export function redactForModel(text: string): { text: string; redactions: number } {
  let redactions = 0;
  let result = text;
  for (const pattern of PATTERNS) {
    result = result.replace(pattern, () => {
      redactions += 1;
      return OMITTED;
    });
  }
  return { text: result, redactions };
}
