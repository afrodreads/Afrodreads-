// Normalização de telefones (foco em Brasil).
//
// Forma canônica armazenada: E.164 com "+", ex.: "+5511987654321".
//
// Estratégia:
//  - Aceita só dígitos e os separadores comuns "( ) + - . espaço"; qualquer
//    outra coisa (letras, ramal) é rejeitada em vez de "adivinhada".
//  - "+55..." ou "0055..." é número brasileiro com código do país.
//  - Sem marcador internacional: remove um "0" de tronco ("011 9...") e, se
//    sobrarem 12 ou 13 dígitos começando em 55, remove o código do país. Um
//    número nacional tem no máximo 11 dígitos, então isso é inequívoco (mesmo
//    para o DDD 55 do Rio Grande do Sul, que tem 10 ou 11 dígitos).
//  - Nacional: DDD (2 dígitos, 11 a 99, sem zero) + 8 ou 9 dígitos.
//      * 9 dígitos: precisa começar com 9 (celular).
//      * 8 dígitos começando em 6 a 9: celular antigo sem o nono dígito (muito
//        comum em contatos do WhatsApp); insere o 9 para que o mesmo aparelho
//        não vire dois clientes.
//      * 8 dígitos começando em 2 a 5: telefone fixo, mantém.
//  - Números com outro código de país ("+1...", "0044...") são aceitos como
//    E.164 genérico (8 a 15 dígitos), sem as regras brasileiras.
//  - Se não der para normalizar com segurança, devolve null.

const ALLOWED_CHARACTERS = /^[\d\s()+\-.]+$/;

function normalizeBrazilianNational(national: string): string | null {
  if (!/^\d{10,11}$/.test(national)) return null;

  const ddd = national.slice(0, 2);
  let subscriber = national.slice(2);

  if (ddd[0] === "0" || ddd[1] === "0") return null;

  if (subscriber.length === 9) {
    if (subscriber[0] !== "9") return null;
  } else {
    const first = subscriber[0];
    if (first >= "6" && first <= "9") {
      subscriber = `9${subscriber}`;
    } else if (first < "2") {
      return null;
    }
  }

  return `+55${ddd}${subscriber}`;
}

export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;

  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > 40) return null;
  if (!ALLOWED_CHARACTERS.test(trimmed)) return null;
  if (trimmed.lastIndexOf("+") > 0) return null;

  let digits = trimmed.replace(/\D/g, "");
  let international = trimmed.startsWith("+");

  if (!international && digits.startsWith("00")) {
    digits = digits.slice(2);
    international = true;
  }

  if (international) {
    if (digits.startsWith("55")) return normalizeBrazilianNational(digits.slice(2));
    if (digits.length < 8 || digits.length > 15 || digits.startsWith("0")) return null;
    return `+${digits}`;
  }

  if (digits.startsWith("0")) digits = digits.slice(1);
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    digits = digits.slice(2);
  }

  return normalizeBrazilianNational(digits);
}

/** Para logs: nunca registre o telefone inteiro. "+5511987654321" vira "+55…4321". */
export function maskPhone(phone: string): string {
  if (phone.length <= 7) return "***";
  return `${phone.slice(0, 3)}…${phone.slice(-4)}`;
}
