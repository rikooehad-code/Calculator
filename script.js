let cur = "0";
let prev = null;
let op = null;
let fresh = false;
let history = [];

const curEl = document.getElementById("cur");
const exprEl = document.getElementById("expr");
const histEl = document.getElementById("history");
const histList = document.getElementById("histList");
const toast = document.getElementById("toast");

/* ---------- حفظ واسترجاع ---------- */
function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch (e) { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}

/* ---------- الوضع الفاتح والداكن ---------- */
const savedTheme = load("theme", null);
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
document.documentElement.dataset.theme = savedTheme || (prefersDark ? "dark" : "light");

document.getElementById("themeBtn").addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  save("theme", next);
});

/* ---------- العرض ---------- */
function fmt(s) {
  if (s === "خطأ") return s;
  const neg = s[0] === "-" ? "-" : "";
  const t = neg ? s.slice(1) : s;
  const parts = t.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return neg + parts.join(".");
}

function show() {
  curEl.textContent = fmt(cur);
  exprEl.textContent = prev !== null && op ? fmt(prev) + " " + op : "";
}

function clean(n) {
  return String(parseFloat(n.toPrecision(12)));
}

/* ---------- الحساب ---------- */
function calc(a, b, o) {
  a = parseFloat(a);
  b = parseFloat(b);
  let r;
  if (o === "+") r = a + b;
  else if (o === "−") r = a - b;
  else if (o === "×") r = a * b;
  else if (o === "÷") {
    if (b === 0) return "خطأ";
    r = a / b;
  } else if (o === "^") r = Math.pow(a, b);
  else return String(b);
  if (!isFinite(r) || isNaN(r)) return "خطأ";
  return clean(r);
}

function reset() {
  cur = "0"; prev = null; op = null; fresh = false;
  show();
}

function num(d) {
  if (cur === "خطأ") reset();
  if (fresh) { cur = "0"; fresh = false; }
  if (cur.replace("-", "").replace(".", "").length >= 15) return;
  cur = cur === "0" ? d : cur + d;
  show();
}

function dot() {
  if (cur === "خطأ") reset();
  if (fresh) { cur = "0"; fresh = false; }
  if (!cur.includes(".")) cur += ".";
  show();
}

function setOp(o) {
  if (cur === "خطأ") return;
  if (op && prev !== null && !fresh) {
    cur = calc(prev, cur, op);
    if (cur === "خطأ") { prev = null; op = null; show(); return; }
  }
  prev = cur; op = o; fresh = true;
  show();
}

function equals() {
  if (op === null || prev === null) return;
  const text = fmt(prev) + " " + op + " " + fmt(cur);
  const res = calc(prev, cur, op);
  exprEl.textContent = text + " =";
  cur = res; prev = null; op = null; fresh = true;
  curEl.textContent = fmt(cur);
  if (res !== "خطأ") addHistory(text + " = " + fmt(res), res);
}

function back() {
  if (fresh || cur === "خطأ") return;
  cur = cur.length > 1 && !(cur.length === 2 && cur[0] === "-") ? cur.slice(0, -1) : "0";
  show();
}

function sign() {
  if (cur === "0" || cur === "خطأ") return;
  cur = cur[0] === "-" ? cur.slice(1) : "-" + cur;
  show();
}

function percent() {
  if (cur === "خطأ") return;
  cur = clean(parseFloat(cur) / 100);
  show();
}

/* ---------- الدوال العلمية ---------- */
function fn(type) {
  if (cur === "خطأ") reset();

  if (type === "pi") {
    cur = clean(Math.PI);
    fresh = true;
    show();
    return;
  }

  const x = parseFloat(cur);
  const shown = fmt(cur);
  let r, label;

  if (type === "sqrt") {
    label = "√(" + shown + ")";
    r = x < 0 ? NaN : Math.sqrt(x);
  } else if (type === "square") {
    label = shown + "²";
    r = x * x;
  } else if (type === "inv") {
    label = "1/(" + shown + ")";
    r = x === 0 ? NaN : 1 / x;
  }

  if (!isFinite(r) || isNaN(r)) {
    cur = "خطأ"; prev = null; op = null;
    show();
    return;
  }

  cur = clean(r);
  fresh = true;
  addHistory(label + " = " + fmt(cur), cur);
  curEl.textContent = fmt(cur);
  exprEl.textContent = label + " =";
}

/* ---------- السجل ---------- */
function addHistory(text, value) {
  history.unshift({ text, value });
  history = history.slice(0, 30);
  save("history", history);
  renderHistory();
}

function renderHistory() {
  histList.innerHTML = "";
  if (history.length === 0) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = "لا توجد عمليات بعد";
    histList.appendChild(p);
    return;
  }
  history.forEach((item) => {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.textContent = item.text;
    b.addEventListener("click", () => {
      cur = item.value; prev = null; op = null; fresh = true;
      show();
      closeHistory();
    });
    li.appendChild(b);
    histList.appendChild(li);
  });
}

function openHistory() {
  histEl.classList.add("open");
  histEl.setAttribute("aria-hidden", "false");
}
function closeHistory() {
  histEl.classList.remove("open");
  histEl.setAttribute("aria-hidden", "true");
}

document.getElementById("histBtn").addEventListener("click", openHistory);
document.getElementById("closeHist").addEventListener("click", closeHistory);
document.getElementById("clearHist").addEventListener("click", () => {
  history = [];
  save("history", history);
  renderHistory();
});

/* ---------- نسخ النتيجة ---------- */
curEl.addEventListener("click", () => {
  if (cur === "خطأ" || !navigator.clipboard) return;
  navigator.clipboard.writeText(cur).then(() => {
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1200);
  });
});

/* ---------- الأزرار ---------- */
function handle(a, v) {
  if (a === "num") num(v);
  else if (a === "op") setOp(v);
  else if (a === "fn") fn(v);
  else if (a === "dot") dot();
  else if (a === "eq") equals();
  else if (a === "clear") reset();
  else if (a === "back") back();
  else if (a === "sign") sign();
  else if (a === "percent") percent();
}

document.querySelector(".calc").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-a]");
  if (b) handle(b.dataset.a, b.dataset.v);
});

/* ---------- لوحة المفاتيح ---------- */
document.addEventListener("keydown", (e) => {
  const k = e.key;
  if (/^[0-9]$/.test(k)) num(k);
  else if (k === ".") dot();
  else if (k === "+") setOp("+");
  else if (k === "-") setOp("−");
  else if (k === "*") setOp("×");
  else if (k === "^") setOp("^");
  else if (k === "/") { e.preventDefault(); setOp("÷"); }
  else if (k === "Enter" || k === "=") { e.preventDefault(); equals(); }
  else if (k === "Backspace") back();
  else if (k === "Escape") { closeHistory(); reset(); }
  else if (k === "%") percent();
});

history = load("history", []);
renderHistory();
show();