// Número real da Afro Dreads em formato E.164 (sem "+"), usado para montar
// links wa.me com texto pré-preenchido — o link curto WHATSAPP_LINK (em
// contact.ts) não aceita override de texto, então botões que precisam de
// uma mensagem contextual usam este módulo.
export const WHATSAPP_PHONE = "5511915388113";

export type WhatsAppMessageKey =
  | "geral"
  | "primeira"
  | "manutencao"
  | "revitalizacao"
  | "duvida";

const MESSAGES: Record<WhatsAppMessageKey, string> = {
  geral: "Oi, Afro Dreads! Vim pelo site e quero ficar no estilo 💛",
  primeira:
    "Oi! Vim pelo site. Nunca fiz dreads e quero fazer a minha primeira aplicação.",
  manutencao: "Oi! Vim pelo site. Já tenho dreads e quero fazer manutenção.",
  revitalizacao: "Oi! Vim pelo site. Quero revitalizar meus dreads.",
  duvida: "Oi! Vim pelo site e tenho uma dúvida sobre os serviços.",
};

export function buildWhatsAppLink(key: WhatsAppMessageKey = "geral", customText?: string): string {
  const text = customText ?? MESSAGES[key];
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`;
}

export function buildWhatsAppFormLink(fields: {
  nome: string;
  servico?: string;
  cor?: string;
  tamanho?: string;
  espessura?: string;
  mensagem?: string;
}): string {
  const lines = [
    `Oi, Afro Dreads! Meu nome é ${fields.nome}.`,
    fields.servico && `Serviço de interesse: ${fields.servico}`,
    fields.cor && `Cor: ${fields.cor}`,
    fields.tamanho && `Tamanho: ${fields.tamanho}`,
    fields.espessura && `Espessura: ${fields.espessura}`,
    fields.mensagem && `Minha ideia: ${fields.mensagem}`,
  ].filter(Boolean);
  return buildWhatsAppLink("geral", lines.join("\n"));
}
