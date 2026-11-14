// Clube Afro Dreads: grupo de ofertas no WhatsApp (projeto do motor em C:\dev\clube-ofertas).
//
// Rodízio de grupos: quando um grupo lotar (limite de ~1.024 pessoas), coloque o link do
// grupo seguinte na frente da variável CLUBE_GRUPOS na Vercel (links separados por
// vírgula). A rota /clube/entrar sempre manda para o primeiro link válido da lista.
// Sem a variável, vale o link do grupo #01 abaixo (link de convite é público por natureza).

export const CLUBE_GRUPO_PADRAO = "https://chat.whatsapp.com/J3m0hmIIkoKKuPbhvwn1CX";

const LINK_DE_GRUPO = /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{10,40}$/;

export function linksDosGrupos(valor: string | undefined): string[] {
  return (valor ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => LINK_DE_GRUPO.test(s));
}

export function grupoAtual(valor: string | undefined = process.env.CLUBE_GRUPOS): string {
  return linksDosGrupos(valor)[0] ?? CLUBE_GRUPO_PADRAO;
}
