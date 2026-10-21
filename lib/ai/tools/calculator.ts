/** Deliberately small safe calculator; never evaluates arbitrary JavaScript. */
export function calculate(expression: string): number {
  if (expression.length > 100 || !/^[\d\s()+\-*/%.]+$/.test(expression)) throw new Error("Only basic arithmetic expressions are supported.");
  const tokens = expression.match(/\d+(?:\.\d+)?|[()+\-*/%]/g) ?? [];
  if (tokens.join("") !== expression.replace(/\s/g, "")) throw new Error("Invalid arithmetic expression.");
  let i = 0;
  function primary(): number { const t = tokens[i++]; if (t === "(") { const v = sum(); if (tokens[i++] !== ")") throw new Error("Missing closing parenthesis."); return v; } if (t === "-") return -primary(); if (t === "+") return primary(); const n = Number(t); if (!Number.isFinite(n)) throw new Error("Invalid number."); return n; }
  function product(): number { let v = primary(); while (["*", "/", "%"].includes(tokens[i] ?? "")) { const op=tokens[i++]!; const r=primary(); if ((op === "/" || op === "%") && r === 0) throw new Error("Division by zero."); v=op === "*" ? v*r : op === "/" ? v/r : v%r; } return v; }
  function sum(): number { let v=product(); while (["+","-"].includes(tokens[i] ?? "")) { const op=tokens[i++]!; const r=product(); v=op === "+" ? v+r : v-r; } return v; }
  const result=sum(); if (i !== tokens.length || !Number.isFinite(result)) throw new Error("Invalid expression."); return result;
}
