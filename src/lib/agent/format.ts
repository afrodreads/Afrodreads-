// Ajuste de formatação do rascunho para o WhatsApp. O modelo às vezes escreve em
// Markdown; no WhatsApp o negrito usa um único asterisco e títulos (#) aparecem
// como símbolos soltos. Só mexe na formatação, nunca no conteúdo.

export function toWhatsappText(text: string): string {
  return text
    // **negrito** (e __negrito__) → *negrito*
    .replace(/\*\*([^*\n]+)\*\*/g, "*$1*")
    .replace(/__([^_\n]+)__/g, "*$1*")
    // "## Título" no início da linha → "Título"
    .replace(/^[ \t]*#{1,6}[ \t]+/gm, "")
    // medida da espessura entre parênteses ("(mais ou menos 1 dedo de largura)"): o dono pediu para nunca usar
    .replace(/[ \t]*\([^()]*\bdedos? de largura[^()]*\)/gi, "")
    // dois-pontos no meio da frase soam robóticos (pedido do dono): "me fala: como"
    // → "me fala, como"; no fim da linha vira ponto. Links (https://) e horas (10:30)
    // não têm espaço depois dos dois-pontos e ficam como estão.
    .replace(/(\S)[ \t]*:[ \t]*(\n|$)/g, "$1.$2")
    .replace(/(\S)[ \t]*:[ \t]+/g, "$1, ")
    // sobra de linhas em branco em excesso
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
