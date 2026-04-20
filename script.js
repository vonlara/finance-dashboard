// ==========================================
// 1. CONFIGURAÇÃO E INICIALIZAÇÃO
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyC45d4cvN__in06fdBYgqj9HPYboUDvuaI",
  authDomain: "finance-dashboard-26fdb.firebaseapp.com",
  projectId: "finance-dashboard-26fdb",
  storageBucket: "finance-dashboard-26fdb.firebasestorage.app",
  messagingSenderId: "1071740399561",
  appId: "1:1071740399561:web:36d7942f115b52e21a0218"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

var auth = firebase.auth();
var db = firebase.firestore();

// ==========================================
// 2. ESTADO GLOBAL
// ==========================================
let transacoes = [];
let usuarioAtual = null;
let chartBarras = null;
let chartPizza = null;
let chartLinha = null;
let charCategorias = null;

// ==========================================
// 3. AUTENTICAÇÃO
// ==========================================

// ✅ cadastrar() apenas UMA VEZ
function cadastrar() {
  const email = document.getElementById("login-usuario").value;
  const senha = document.getElementById("login-senha").value;

  if (!email || !senha) {
    alert("Por favor, preencha e-mail e senha.");
    return;
  }

  auth.createUserWithEmailAndPassword(email, senha)
    .then(() => alert("Conta criada com sucesso! Clique em Entrar."))
    .catch(error => alert("Erro ao cadastrar: " + error.message));
}

function fazerLogin() {
  const email = document.getElementById("login-usuario").value;
  const senha = document.getElementById("login-senha").value;
  const erroEl = document.getElementById("login-erro");

  auth.signInWithEmailAndPassword(email, senha)
    .catch(error => {
      erroEl.textContent = "E-mail ou senha inválidos.";
      console.error(error);
    });
}

function fazerLogout() {
  auth.signOut();
}

auth.onAuthStateChanged(user => {
  const telaLogin = document.getElementById("tela-login");
  const appPrincipal = document.getElementById("app");

  if (user) {
    usuarioAtual = user.uid;
    telaLogin.classList.add("hidden");
    appPrincipal.classList.remove("hidden");
    carregarDados();
  } else {
    usuarioAtual = null;
    telaLogin.classList.remove("hidden");
    appPrincipal.classList.add("hidden");
  }
});

// ==========================================
// 4. FIRESTORE
// ==========================================

function salvarDados() {
  if (!usuarioAtual) return;
  db.collection("usuarios").doc(usuarioAtual).set({ transacoes });
}

function carregarDados() {
  if (!usuarioAtual) return;
  db.collection("usuarios").doc(usuarioAtual).get().then(doc => {
    transacoes = doc.exists ? (doc.data().transacoes || []) : [];
    renderizarTudo();
  });
}

// ==========================================
// 5. LÓGICA DO APP
// ==========================================

function adicionarTransacao() {
  const descricao = document.getElementById("descricao").value.trim();
  const valor = parseFloat(document.getElementById("valor").value);
  const tipo = document.getElementById("tipo").value;
  const mesAno = document.getElementById("mes-ano").value;
  const categoria = document.getElementById("categoria").value;

  if (!descricao || isNaN(valor) || !mesAno) {
    alert("Preencha todos os campos corretamente!");
    return;
  }

  transacoes.push({ descricao, valor, tipo, mesAno, categoria });
  salvarDados();
  renderizarTudo();

  document.getElementById("descricao").value = "";
  document.getElementById("valor").value = "";
}

function mudarAba(nome) {
  document.querySelectorAll(".aba").forEach(a => a.classList.add("hidden"));
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));

  document.getElementById("aba-" + nome).classList.remove("hidden");
  event.currentTarget.classList.add("active");

  if (nome === "graficos") renderizarGraficos();
}
// ==========================================
// 6. RENDERIZAÇÃO
// ==========================================

function renderizarTudo() {
  atualizarResumo();
  renderizarHistorico();

  // Atualiza badge da aba Transações
  document.getElementById("badge-count").textContent = transacoes.length;
}

function atualizarResumo() {
  const entradas = transacoes
    .filter(t => t.tipo === "entrada")
    .reduce((acc, t) => acc + t.valor, 0);

  const saidas = transacoes
    .filter(t => t.tipo === "saida")
    .reduce((acc, t) => acc + t.valor, 0);

  const saldo = entradas - saidas;

  const fmt = v => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  document.getElementById("total-entradas").textContent = fmt(entradas);
  document.getElementById("total-saidas").textContent = fmt(saidas);

  const elSaldo = document.getElementById("saldo");
  elSaldo.textContent = fmt(saldo);
  elSaldo.className = "card-valor " + (saldo > 0 ? "saldo-positivo" : saldo < 0 ? "saldo-negativo" : "saldo-neutro");
}

function renderizarHistorico() {
  const container = document.getElementById("historico");

  if (transacoes.length === 0) {
    container.innerHTML = "<p class='historico-vazio'>Nenhuma transação ainda.</p>";
    return;
  }

  const grupos = {};
  transacoes.forEach((t, i) => {
    if (!grupos[t.mesAno]) grupos[t.mesAno] = [];
    grupos[t.mesAno].push({ ...t, index: i });
  });

  const mesesOrdenados = Object.keys(grupos).sort((a, b) => b.localeCompare(a));

  container.innerHTML = mesesOrdenados.map(mes => {
    const [ano, m] = mes.split("-");
    const nomeMes = new Date(ano, m - 1).toLocaleString("pt-BR", { month: "long", year: "numeric" });

    const itens = grupos[mes].map(t => `
      <div class="transacao-item ${t.tipo}">
        <div class="transacao-info">
          <span class="transacao-desc">${t.descricao}</span>
          <span class="transacao-tipo">
            ${t.tipo === "entrada" ? "↑" : "↓"}
            ${t.categoria || (t.tipo === "entrada" ? "Entrada" : "Saída")}
          </span>
        </div>
        <div class="transacao-direita">
          <span class="transacao-valor">${t.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
          <button class="btn-remover" onclick="removerTransacao(${t.index})">✕</button>
        </div>
      </div>
    `).join("");

    return `
      <div class="grupo-mes">
        <div class="grupo-mes-titulo">${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}</div>
        ${itens}
      </div>
    `;
  }).join("");
  }

  // Agrupa por mês/ano
  const grupos = {};
  transacoes.forEach((t, i) => {
    if (!grupos[t.mesAno]) grupos[t.mesAno] = [];
    grupos[t.mesAno].push({ ...t, index: i });
  });

  // Ordena meses do mais recente para o mais antigo
  const mesesOrdenados = Object.keys(grupos).sort((a, b) => b.localeCompare(a));

  container.innerHTML = mesesOrdenados.map(mes => {
    const [ano, m] = mes.split("-");
    const nomeMes = new Date(ano, m - 1).toLocaleString("pt-BR", { month: "long", year: "numeric" });

    const itens = grupos[mes].map(t => `
      <div class="transacao-item ${t.tipo}">
        <div class="transacao-info">
          <span class="transacao-desc">${t.descricao}</span>
          <span class="transacao-tipo">${t.tipo === "entrada" ? "↑ Entrada" : "↓ Saída"}</span>
        </div>
        <div class="transacao-direita">
          <span class="transacao-valor">${t.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
          <button class="btn-remover" onclick="removerTransacao(${t.index})">✕</button>
        </div>
      </div>
    `).join("");

    return `
      <div class="grupo-mes">
        <div class="grupo-mes-titulo">${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}</div>
        ${itens}
      </div>
    `;
  }).join("");
}

function removerTransacao(index) {
  if (!confirm("Remover esta transação?")) return;
  transacoes.splice(index, 1);
  salvarDados();
  renderizarTudo();
}

function limparTudo() {
  if (!confirm("Apagar todas as transações?")) return;
  transacoes = [];
  salvarDados();
  renderizarTudo();
}

// ==========================================
// 7. GRÁFICOS
// ==========================================

function renderizarGraficos() {
  if (transacoes.length === 0) return;

  const meses = [...new Set(transacoes.map(t => t.mesAno))].sort();

  const entPorMes = meses.map(m =>
    transacoes.filter(t => t.mesAno === m && t.tipo === "entrada").reduce((a, t) => a + t.valor, 0)
  );
  const saiPorMes = meses.map(m =>
    transacoes.filter(t => t.mesAno === m && t.tipo === "saida").reduce((a, t) => a + t.valor, 0)
  );

  const labels = meses.map(m => {
    const [ano, mes] = m.split("-");
    return new Date(ano, mes - 1).toLocaleString("pt-BR", { month: "short", year: "2-digit" });
  });

  // Gráfico de barras
  if (chartBarras) chartBarras.destroy();
  chartBarras = new Chart(document.getElementById("chart-barras"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Entradas", data: entPorMes, backgroundColor: "#3ecf8e" },
        { label: "Saídas",   data: saiPorMes, backgroundColor: "#f06565" }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: "top", labels: { color: "#f0ede8" } } },
      scales: { x: { ticks: { color: "#7a7a85" } }, y: { ticks: { color: "#7a7a85" } } }
    }
  });

  // Gráfico de pizza — entradas vs saídas
  const totalEnt = transacoes.filter(t => t.tipo === "entrada").reduce((a, t) => a + t.valor, 0);
  const totalSai = transacoes.filter(t => t.tipo === "saida").reduce((a, t) => a + t.valor, 0);

  if (chartPizza) chartPizza.destroy();
  chartPizza = new Chart(document.getElementById("chart-pizza"), {
    type: "doughnut",
    data: {
      labels: ["Entradas", "Saídas"],
      datasets: [{ data: [totalEnt, totalSai], backgroundColor: ["#3ecf8e", "#f06565"] }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: "top", labels: { color: "#f0ede8" } } }
    }
  });

  // Gráfico de linha — evolução do saldo
  let saldoAcumulado = 0;
  const saldoPorMes = meses.map(m => {
    const ent = transacoes.filter(t => t.mesAno === m && t.tipo === "entrada").reduce((a, t) => a + t.valor, 0);
    const sai = transacoes.filter(t => t.mesAno === m && t.tipo === "saida").reduce((a, t) => a + t.valor, 0);
    saldoAcumulado += ent - sai;
    return saldoAcumulado;
  });

  if (chartLinha) chartLinha.destroy();
  chartLinha = new Chart(document.getElementById("chart-linha"), {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Saldo acumulado",
        data: saldoPorMes,
        borderColor: "#e8c96a",
        backgroundColor: "rgba(232,201,106,0.1)",
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: "top", labels: { color: "#f0ede8" } } },
      scales: { x: { ticks: { color: "#7a7a85" } }, y: { ticks: { color: "#7a7a85" } } }
    }
  });

  // ✅ NOVO — Gráfico de categorias de saída
  const categoriasSaida = {};
  transacoes.filter(t => t.tipo === "saida" && t.categoria).forEach(t => {
    categoriasSaida[t.categoria] = (categoriasSaida[t.categoria] || 0) + t.valor;
  });

  const coresCategorias = ["#f06565","#e8c96a","#3ecf8e","#818cf8","#fb923c","#38bdf8","#f472b6","#a3e635"];

  if (Object.keys(categoriasSaida).length > 0) {
    if (chartCategorias) chartCategorias.destroy();
    chartCategorias = new Chart(document.getElementById("chart-categorias"), {
      type: "doughnut",
      data: {
        labels: Object.keys(categoriasSaida),
        datasets: [{
          data: Object.values(categoriasSaida),
          backgroundColor: coresCategorias
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: "right", labels: { color: "#f0ede8", font: { size: 12 } } } }
      }
    });
  }
}
