import { parse, evaluate, toTex, toText } from "../core/parser.js";
import { fail, str } from "../core/validate.js";

export function readVar(input, key = "v") {
  const v = str(input, key, "متغیر", { default: "x" }).trim();
  if (!/^[a-df-zA-Z]$/.test(v)) fail("متغیر ایک ہی انگریزی حرف ہونا چاہیے (e کے علاوہ)۔", key);
  return v;
}

export function readExpr(input, key, v, label = "تفاعل") {
  const s = str(input, key, label);
  try {
    return parse(s, [v]);
  } catch (e) {
    if (e.name === "InputError") fail(`${label}: ${e.message}`, key);
    throw e;
  }
}

export function f1(node, v) {
  return (x) => {
    try { return evaluate(node, { [v]: x }); } catch { return NaN; }
  };
}

export { toTex, toText };
