// Keep $..$ and $$..$$ out of markdown parsing (so `_` and `*` inside math are not
// turned into emphasis) and print them back as-is for MathJax.
export default function mathPassthrough(md) {
  md.inline.ruler.before("escape", "math", (state, silent) => {
    if (state.src[state.pos] !== "$") return false;
    const rest = state.src.slice(state.pos);
    const m = /^\$\$[\s\S]+?\$\$/.exec(rest) || /^\$[^$\n]+?\$/.exec(rest);
    if (!m) return false;
    if (!silent) state.push("math", "", 0).content = m[0];
    state.pos += m[0].length;
    return true;
  });
  md.renderer.rules.math = (tokens, i) => md.utils.escapeHtml(tokens[i].content);
}
