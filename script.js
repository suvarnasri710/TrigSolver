// DOM Elements
const historyList = document.getElementById("historyList");
const ctx = document.getElementById("graph").getContext("2d");
const body = document.body;
const toggleBtn = document.getElementById("toggleDark");
let chart; // chart.js instance

/* =============================
   BASIC INPUT FUNCTIONS
   ============================= */
function insert(value) {
  document.getElementById("expression").value += value;
}
function clearInput() {
  document.getElementById("expression").value = "";
  document.getElementById("result").textContent = "";
  document.getElementById("warn").textContent = "";
}
function backspace() {
  let field = document.getElementById("expression");
  field.value = field.value.slice(0, -1);
}

/* =============================
   KEYBOARD SUPPORT
   ============================= */
document.addEventListener("keydown", (e) => {
  const field = document.getElementById("expression");

  if ((e.key >= "0" && e.key <= "9") || "+-*/().^%".includes(e.key)) {
    field.value += e.key;
  } else if (e.key === "Enter") {
    e.preventDefault();
    calculate();
  } else if (e.key === "Backspace") {
    backspace();
  } else if (e.key === "Delete") {
    clearInput();
  }
});

/* =============================
   CUSTOM TRIG PARSER
   ============================= */
function customTrig(expr, unit) {
  return expr.replace(
    /(sin|cos|tan|sec|csc|cot|asin|acos|atan|sinh|cosh|tanh)\(([^)]+)\)/g,
    (match, fn, arg) => {
      try {
        let angle = math.evaluate(arg);

        // For standard trig (sin, cos, tan, sec, csc, cot) convert degrees
        if (unit === "deg" && !fn.includes("h") && !fn.startsWith("a")) {
          angle = math.unit(angle, "deg").toNumber("rad");
        }

        switch(fn) {
          case "sin": return `math.sin(${angle})`;
          case "cos": return `math.cos(${angle})`;
          case "tan": return `math.tan(${angle})`;
          case "sec": return `1/math.cos(${angle})`;
          case "csc": return `1/math.sin(${angle})`;
          case "cot": return `1/math.tan(${angle})`;
          case "asin": return unit==="deg"
              ? `math.asin(${arg})*180/Math.PI`
              : `math.asin(${arg})`;
          case "acos": return unit==="deg"
              ? `math.acos(${arg})*180/Math.PI`
              : `math.acos(${arg})`;
          case "atan": return unit==="deg"
              ? `math.atan(${arg})*180/Math.PI`
              : `math.atan(${arg})`;
          default: return `math.${fn}(${arg})`; // hyperbolic handled directly
        }
      } catch {
        return "NaN";
      }
    }
  );
}

/* =============================
   CALCULATE EXPRESSION
   ============================= */
function calculate() {
  const expr = document.getElementById("expression").value;
  const unit = document.getElementById("unit").value;
  const precision = parseInt(document.getElementById("precision").value);
  const warn = document.getElementById("warn");
  warn.textContent = "";

  try {
    const transformed = customTrig(expr, unit);
    const result = eval(transformed);

    if (!isFinite(result)) {
      warn.textContent = "⚠️ Value is undefined";
      return;
    }

    const rounded = math.round(result, precision);
    document.getElementById("result").textContent = rounded;

    // Save history
    const li = document.createElement("li");
    li.textContent = `${expr} = ${rounded}`;
    historyList.appendChild(li);

    // Draw graph if expression includes x
    if (expr.includes("x")) {
      plotGraph(expr, unit);
    }
  } catch (e) {
    warn.textContent = "⚠️ Error: " + e.message;
  }
}

/* =============================
   GRAPH PLOTTING (Chart.js)
   ============================= */
function plotGraph(expr, unit) {
  if (chart) chart.destroy();

  const isDark = body.classList.contains("dark");
  const lineColor = isDark ? "#4FC3F7" : "blue";
  const gridColor = isDark ? "#555" : "#ccc";
  const textColor = isDark ? "#f1f1f1" : "#222";

  const xs = math.range(unit === "deg" ? -360 : -6.28,
                        unit === "deg" ? 360 : 6.28,
                        unit === "deg" ? 5 : 0.1).toArray();
  const ys = xs.map(x => {
    try {
      let e = customTrig(expr.replace(/x/g, `(${x})`), unit);
      return eval(e);
    } catch { return NaN; }
  });

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: xs,
      datasets: [{
        label: expr,
        data: ys,
        borderColor: lineColor,
        borderWidth: 2,
        pointRadius: 0,
        fill: false
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: textColor } }
      },
      scales: {
        x: {
          title: { display: true, text: unit === "deg" ? "Degrees" : "Radians", color: textColor },
          ticks: { color: textColor },
          grid: { color: gridColor }
        },
        y: {
          title: { display: true, text: "y", color: textColor },
          ticks: { color: textColor },
          grid: { color: gridColor }
        }
      }
    }
  });
}

/* =============================
   DARK MODE TOGGLE (with memory)
   ============================= */
// Load saved theme
if (localStorage.getItem("mode") === "dark") {
  body.classList.remove("light");
  body.classList.add("dark");
  toggleBtn.textContent = "☀️ Light Mode";
}

// Button action
toggleBtn.addEventListener("click", () => {
  body.classList.toggle("dark");
  body.classList.toggle("light");
  const isDark = body.classList.contains("dark");

  toggleBtn.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
  localStorage.setItem("mode", isDark ? "dark" : "light");

  // Update graph colors if graph exists
  const expr = document.getElementById("expression").value;
  const unit = document.getElementById("unit").value;
  if (expr.includes("x")) plotGraph(expr, unit);
});
