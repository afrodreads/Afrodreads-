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
    // sobra de linhas em branco em excesso
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
