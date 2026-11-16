import { parseNumber } from "./format.js";
import { parse, evaluate } from "./parser.js";
import { num, isBlank, fail } from "./validate.js";

export function numx(input, key, label, opts = {}) {
  const raw = input[key];
  if (isBlank(raw) || !Number.isNaN(parseNumber(raw))) return num(input, key, label, opts);
  let v;
  try {
    v = evaluate(parse(String(raw), []), {});
  } catch {
    fail(`The value ${label} is not an integer or a numeric expression (such as 2pi or sqrt(2)).`, key);
  }
  return num({ [key]: v }, key, label, opts);
}
