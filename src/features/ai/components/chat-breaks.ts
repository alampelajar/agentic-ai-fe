/** The few fields of a Markdown syntax-tree node this plugin reads. */
type MdNode = { type: string; value?: string; children?: MdNode[] }

const BREAK = /<br\s*\/?>|\r?\n/i
const BREAK_TAG = /^<br\s*\/?>$/i

/**
 * A remark plugin for chat answers, where a model writes the way it writes in a
 * chat box rather than in a document:
 *
 * - a single new line is a line break (plain Markdown would run the lines together);
 * - `<br>` and `<br/>` are line breaks too, which models use inside table cells, where
 *   a real new line cannot go.
 *
 * Only ordinary text is touched. Code, inline code and every other kind of HTML are
 * left as they are, so nothing the model wrote as code changes meaning.
 */
export function remarkChatBreaks() {
  return (tree: MdNode) => convert(tree)
}

function convert(node: MdNode) {
  if (!node.children) return
  const next: MdNode[] = []
  for (const child of node.children) {
    if (child.type === 'html' && BREAK_TAG.test((child.value ?? '').trim())) {
      next.push({ type: 'break' })
    } else if (child.type === 'text' && child.value && BREAK.test(child.value)) {
      child.value.split(new RegExp(BREAK.source, 'gi')).forEach((part, index) => {
        if (index > 0) next.push({ type: 'break' })
        if (part) next.push({ type: 'text', value: part })
      })
    } else {
      convert(child)
      next.push(child)
    }
  }
  node.children = next
}
