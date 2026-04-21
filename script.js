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
let chartCategorias = null;

// ==========================================
// 3. AUTENTICAÇÃO
// ==========================================

function cadastrar() {
  const email = document.getElementById("login-usuario").value;
  const senha = document.getElementById("login-senha").value;
  if (!email || !senha) { alert("Por favor, preencha e-mail e senha."); return; }
  auth.createUserWithEmailAndPassword(email, senha)
    .then(() => alert("Conta criada com sucesso! Clique em Entrar."))
    .catch(error => alert("Erro ao cadastrar: " + error.message));
}

function fazerLogin() {
  const email = document.getElementById("login-usuario").value;
  const senha = document.getElementById("login-senha").value;
  const erroEl = document.getElementById("login-erro");
  auth.signInWithEmailAndPassword(email, senha)
    .catch(error => { erroEl.textContent = "E-mail ou senha inválidos."; console.error(error); });
}

function fazerLogout() { auth.signOut(); }

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
// 5. AUTOCOMPLETE DE GRUPOS
// ==========================================

function getGrupos() {
  const grupos = transacoes
    .map(t => t.grupo)
    .filter(g => g && g.trim() !== "");
  return [...new Set(grupos)].sort();
}

function mostrarSugestoes() {
  const input = document.getElementById("grupo").value.toLowerCase();
  const lista = document.getElementById("sugestoes-grupo");
  const grupos = getGrupos().filter(g => g.toLowerCase().includes(input));

  if (grupos.length === 0) { lista.classList.add("hidden"); return; }

  lista.innerHTML = grupos.map(g =>
    `<div class="sugestao-item" onmousedown="selecionarGrupo('${g.replace(/'/g, "\\'")}')">${g}</div>`
  ).join("");
  lista.classList.remove("hidden");
}

function selecionarGrupo(nome) {
  document.getElementById("grupo").value = nome;
  fecharSugestoes();
}

function fecharSugestoes() {
  document.getElementById("sugestoes-grupo").classList.add("hidden");
}

// ==========================================
// 6. LÓGICA DO APP
// ==========================================

function adicionarTransacao() {
  const descricao = document.getElementById("descricao").value.trim();
  const valor = parseFloat(document.getElementById("valor").value);
  const tipo = document.getElementById("tipo").value;
  const mesAno = document.getElementById("mes-ano").value;
  const grupo = document.getElementById("grupo").value.trim();

  if (!descricao || isNaN(valor) || !mesAno) {
    alert("Preencha todos os campos corretamente!");
    return;
  }

  const btn = document.querySelector(".btn-add");

  // Fase 1: shimmer
  btn.classList.add("loading");
  btn.innerHTML = `<span style="font-size:18px">⏳</span> Salvando…`;

  setTimeout(() => {
    transacoes.push({ descricao, valor, tipo, mesAno, grupo });
    salvarDados();
    renderizarTudo();

    // Fase 2: sucesso
    btn.classList.remove("loading");
    btn.classList.add("sucesso");
    btn.innerHTML = `<span style="font-size:18px">✓</span> Adicionado!`;

    document.getElementById("descricao").value = "";
    document.getElementById("valor").value = "";
    document.getElementById("grupo").value = "";

    // Fase 3: volta ao normal
    setTimeout(() => {
      btn.classList.remove("sucesso");
      btn.style.background = "";
      btn.innerHTML = `<span>+</span> Adicionar transação`;
    }, 1200);

  }, 500);

}

function mudarAba(nome) {
  document.querySelectorAll(".aba").forEach(a => a.classList.add("hidden"));
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.getElementById("aba-" + nome).classList.remove("hidden");
  event.currentTarget.classList.add("active");
  if (nome === "graficos") renderizarGraficos();
}

// ==========================================
// 7. RENDERIZAÇÃO
// ==========================================

function renderizarTudo() {
  atualizarResumo();
  renderizarHistorico();
  document.getElementById("badge-count").textContent = transacoes.length;
}

function atualizarResumo() {
  const entradas = transacoes.filter(t => t.tipo === "entrada").reduce((acc, t) => acc + t.valor, 0);
  const saidas = transacoes.filter(t => t.tipo === "saida").reduce((acc, t) => acc + t.valor, 0);
  const saldo = entradas - saidas;
  const fmt = v => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  document.getElementById("total-entradas").textContent = fmt(entradas);
  document.getElementById("total-saidas").textContent = fmt(saidas);

  const elSaldo = document.getElementById("saldo");
  elSaldo.textContent = fmt(saldo);
  elSaldo.className = "card-valor " + (saldo > 0 ? "saldo-positivo" : saldo < 0 ? "saldo-negativo" : "saldo-neutro");

  // Card maior grupo de gasto
  const gastosPorGrupo = {};
  transacoes.filter(t => t.tipo === "saida" && t.grupo).forEach(t => {
    gastosPorGrupo[t.grupo] = (gastosPorGrupo[t.grupo] || 0) + t.valor;
  });

  const elGrupo = document.getElementById("maior-grupo");
  const elGrupoValor = document.getElementById("maior-grupo-valor");

  if (Object.keys(gastosPorGrupo).length > 0) {
    const top = Object.entries(gastosPorGrupo).sort((a, b) => b[1] - a[1])[0];
    elGrupo.textContent = top[0];
    elGrupoValor.textContent = fmt(top[1]);
  } else {
    elGrupo.textContent = "—";
    elGrupoValor.textContent = "";
  }
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
          <div style="display:flex; align-items:center; gap:6px; margin-top:3px; flex-wrap:wrap;">
            <span class="transacao-tipo">${t.tipo === "entrada" ? "↑ Entrada" : "↓ Saída"}</span>
            ${t.grupo ? `<span class="tag-grupo">${t.grupo}</span>` : ""}
          </div>
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
// 8. GRÁFICOS
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

  // Gráfico por grupo (saídas com grupo) + sem grupo agrupados por descrição
  const gastosPorGrupo = {};
  transacoes.filter(t => t.tipo === "saida").forEach(t => {
    const chave = t.grupo && t.grupo.trim() !== "" ? t.grupo : t.descricao;
    gastosPorGrupo[chave] = (gastosPorGrupo[chave] || 0) + t.valor;
  });

  const top6 = Object.entries(gastosPorGrupo)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const coresCategorias = ["#f06565","#e8c96a","#3ecf8e","#818cf8","#fb923c","#38bdf8"];

  if (top6.length > 0) {
    if (chartCategorias) chartCategorias.destroy();
    chartCategorias = new Chart(document.getElementById("chart-categorias"), {
      type: "doughnut",
      data: {
        labels: top6.map(i => i[0]),
        datasets: [{ data: top6.map(i => i[1]), backgroundColor: coresCategorias }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: "right", labels: { color: "#f0ede8", font: { size: 12 } } } }
      }
    });
  }
}
