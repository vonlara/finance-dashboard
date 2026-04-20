// CONFIG FIREBASE
const firebaseConfig = {
  apiKey: "COLE_AQUI",
  authDomain: "COLE_AQUI",
  projectId: "COLE_AQUI",
};

// INICIALIZA
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// ============================================================
// CONSTANTES E ESTADO
// ============================================================
const USUARIO_CORRETO = "admin";
const SENHA_CORRETA   = "1234";
const STORAGE_KEY     = "pf_transacoes";

let transacoes = [];
let chartBarras = null;
let chartPizza  = null;
let chartLinha  = null;
// ============================================================
// CADASTRAR
// ============================================================
function cadastrar() {
  const email = document.getElementById("login-usuario").value;
  const senha = document.getElementById("login-senha").value;

  auth.createUserWithEmailAndPassword(email, senha)
    .then(() => {
      alert("Conta criada com sucesso!");
    })
    .catch(error => {
      alert(error.message);
    });
}
// ============================================================
// LOGIN / LOGOUT
// ============================================================
function fazerLogin() {
  const email = document.getElementById("login-usuario").value;
  const senha = document.getElementById("login-senha").value;
  const erroEl = document.getElementById("login-erro");

  auth.signInWithEmailAndPassword(email, senha)
    .then(() => {
      document.getElementById("tela-login").classList.add("hidden");
      document.getElementById("app").classList.remove("hidden");
      erroEl.textContent = "";
      carregarDados();
      renderizarTudo();
    })
    .catch(() => {
      erroEl.textContent = "Email ou senha inválidos.";
    });
}
function fazerLogout() {
  auth.signOut();
}

// Permitir Enter no login
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("login-senha").addEventListener("keydown", e => {
    if (e.key === "Enter") fazerLogin();
  });
  document.getElementById("login-usuario").addEventListener("keydown", e => {
    if (e.key === "Enter") fazerLogin();
  });

  // Preenche o campo de mês com o mês atual
  const hoje = new Date();
  const mesAtual = hoje.getFullYear() + "-" + String(hoje.getMonth() + 1).padStart(2, "0");
  document.getElementById("mes-ano").value = mesAtual;
});

// ============================================================
// PERSISTÊNCIA — localStorage
// ============================================================
function salvarDados() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transacoes));
}

function carregarDados() {
  const dados = localStorage.getItem(STORAGE_KEY);
  transacoes = dados ? JSON.parse(dados) : [];
}

// ============================================================
// ABAS
// ============================================================
function mudarAba(nome) {
  document.querySelectorAll(".aba").forEach(a  => a.classList.add("hidden"));
  document.querySelectorAll(".tab").forEach(t  => t.classList.remove("active"));

  document.getElementById("aba-" + nome).classList.remove("hidden");

  const nomes = ["principal", "transacoes", "graficos"];
  const idx   = nomes.indexOf(nome);
  document.querySelectorAll(".tab")[idx].classList.add("active");

  if (nome === "graficos") renderizarGraficos();
}

// ============================================================
// ADICIONAR / REMOVER TRANSAÇÃO
// ============================================================
function adicionarTransacao() {
  const descricao = document.getElementById("descricao").value.trim();
  const valor     = parseFloat(document.getElementById("valor").value);
  const tipo      = document.getElementById("tipo").value;
  const mesAno    = document.getElementById("mes-ano").value; // "YYYY-MM"

  if (descricao === "" || isNaN(valor) || valor <= 0 || mesAno === "") {
    alert("Preencha todos os campos com valores válidos!");
    return;
  }

  transacoes.push({ descricao, valor, tipo, mesAno });
  salvarDados();
  renderizarTudo();
  limparFormulario();
}

function removerTransacao(indice) {
  transacoes.splice(indice, 1);
  salvarDados();
  renderizarTudo();
}

function limparTudo() {
  if (transacoes.length === 0) return;
  if (!confirm("Deseja apagar todas as transações?")) return;
  transacoes = [];
  salvarDados();
  renderizarTudo();
}

function limparFormulario() {
  document.getElementById("descricao").value = "";
  document.getElementById("valor").value     = "";
  document.getElementById("descricao").focus();
}

// ============================================================
// RENDERIZAÇÃO GERAL
// ============================================================
function renderizarTudo() {
  atualizarResumo();
  renderizarHistorico();
  document.getElementById("badge-count").textContent = transacoes.length;
}

// ============================================================
// RESUMO (saldo, entradas, saídas)
// ============================================================
function atualizarResumo() {
  let entradas = 0, saidas = 0;

  transacoes.forEach(t => {
    if (t.tipo === "entrada") entradas += t.valor;
    else saidas += t.valor;
  });

  const saldo = entradas - saidas;
  const saldoEl = document.getElementById("saldo");

  saldoEl.textContent = fmt(saldo);
  saldoEl.className   = "card-valor " +
    (saldo > 0 ? "saldo-positivo" : saldo < 0 ? "saldo-negativo" : "saldo-neutro");

  document.getElementById("total-entradas").textContent = fmt(entradas);
  document.getElementById("total-saidas").textContent   = fmt(saidas);
}

// ============================================================
// HISTÓRICO AGRUPADO POR MÊS/ANO
// ============================================================
function renderizarHistorico() {
  const container = document.getElementById("historico");
  container.innerHTML = "";

  if (transacoes.length === 0) {
    container.innerHTML = `<div class="historico-vazio">Nenhuma transação ainda.<br>Adicione na aba Principal!</div>`;
    return;
  }

  // Agrupa por mesAno
  const grupos = {};
  transacoes.forEach((t, i) => {
    const key = t.mesAno || "0000-00";
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push({ ...t, indiceOriginal: i });
  });

  // Ordena os grupos do mais recente para o mais antigo
  const chaves = Object.keys(grupos).sort((a, b) => b.localeCompare(a));

  chaves.forEach(chave => {
    const itens = grupos[chave];
    let entMes = 0, saiMes = 0;
    itens.forEach(t => {
      if (t.tipo === "entrada") entMes += t.valor;
      else saiMes += t.valor;
    });
    const saldoMes = entMes - saiMes;

    const grupo = document.createElement("div");
    grupo.className = "mes-grupo";

    const header = document.createElement("div");
    header.className = "mes-header";
    header.innerHTML = `
      <span class="mes-titulo">${formatarMesAno(chave)}</span>
      <span class="mes-saldo ${saldoMes >= 0 ? "pos" : "neg"}">${saldoMes >= 0 ? "+" : ""}${fmt(saldoMes)}</span>
    `;

    const ul = document.createElement("ul");

    itens.forEach(t => {
      const li = document.createElement("li");
      li.classList.add(t.tipo);
      const sinal = t.tipo === "entrada" ? "+" : "−";
      const icone = t.tipo === "entrada" ? "↑" : "↓";
      li.innerHTML = `
        <div class="li-icone">${icone}</div>
        <div class="li-info">
          <div class="li-descricao">${t.descricao}</div>
          <div class="li-tipo">${t.tipo}</div>
        </div>
        <span class="li-valor">${sinal} ${fmt(t.valor)}</span>
        <button class="btn-remover" onclick="removerTransacao(${t.indiceOriginal})" title="Remover">✕</button>
      `;
      ul.appendChild(li);
    });

    grupo.appendChild(header);
    grupo.appendChild(ul);
    container.appendChild(grupo);
  });
}

// ============================================================
// GRÁFICOS
// ============================================================
function renderizarGraficos() {
  const wrap = document.querySelector(".graficos-wrap");

  if (transacoes.length === 0) {
    wrap.innerHTML = `<div class="sem-dados">Nenhuma transação para exibir.<br>Adicione transações na aba Principal!</div>`;
    return;
  }

  // Reconstrói o HTML dos gráficos (caso tenha sido substituído pela msg de sem dados)
  wrap.innerHTML = `
    <div class="grafico-card">
      <div class="grafico-titulo">Entradas vs Saídas por mês</div>
      <div style="position:relative;height:260px;">
        <canvas id="chart-barras" role="img" aria-label="Entradas e saídas por mês"></canvas>
      </div>
    </div>
    <div class="grafico-card">
      <div class="grafico-titulo">Distribuição geral</div>
      <div style="position:relative;height:240px;">
        <canvas id="chart-pizza" role="img" aria-label="Proporção entradas e saídas"></canvas>
      </div>
    </div>
    <div class="grafico-card">
      <div class="grafico-titulo">Evolução do saldo</div>
      <div style="position:relative;height:240px;">
        <canvas id="chart-linha" role="img" aria-label="Evolução do saldo acumulado"></canvas>
      </div>
    </div>
  `;

  // Destrói gráficos anteriores
  if (chartBarras) { chartBarras.destroy(); chartBarras = null; }
  if (chartPizza)  { chartPizza.destroy();  chartPizza  = null; }
  if (chartLinha)  { chartLinha.destroy();  chartLinha  = null; }

  // Agrega dados por mês
  const agregado = {};
  transacoes.forEach(t => {
    const k = t.mesAno || "0000-00";
    if (!agregado[k]) agregado[k] = { entradas: 0, saidas: 0 };
    if (t.tipo === "entrada") agregado[k].entradas += t.valor;
    else                      agregado[k].saidas   += t.valor;
  });

  const meses    = Object.keys(agregado).sort();
  const labels   = meses.map(formatarMesAno);
  const entradas = meses.map(m => +agregado[m].entradas.toFixed(2));
  const saidas   = meses.map(m => +agregado[m].saidas.toFixed(2));

  // Saldo acumulado
  let acum = 0;
  const saldos = meses.map(m => {
    acum += agregado[m].entradas - agregado[m].saidas;
    return +acum.toFixed(2);
  });

  const totalEntradas = entradas.reduce((a, b) => a + b, 0);
  const totalSaidas   = saidas.reduce((a, b) => a + b, 0);

  const optsBase = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {}
  };

  const escalaBase = {
    grid:  { color: "rgba(255,255,255,0.05)" },
    ticks: { color: "#7a7a85", font: { family: "Outfit", size: 11 } }
  };

  // 1. Gráfico de barras
  chartBarras = new Chart(document.getElementById("chart-barras"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Entradas",
          data: entradas,
          backgroundColor: "rgba(62,207,142,0.7)",
          borderColor: "#3ecf8e",
          borderWidth: 1,
          borderRadius: 6
        },
        {
          label: "Saídas",
          data: saidas,
          backgroundColor: "rgba(240,101,101,0.7)",
          borderColor: "#f06565",
          borderWidth: 1,
          borderRadius: 6
        }
      ]
    },
    options: {
      ...optsBase,
      plugins: {
        legend: {
          display: true,
          labels: { color: "#7a7a85", font: { family: "Outfit", size: 11 }, boxWidth: 12, boxHeight: 12 }
        }
      },
      scales: {
        x: { ...escalaBase, ticks: { ...escalaBase.ticks, autoSkip: false, maxRotation: 30 } },
        y: {
          ...escalaBase,
          ticks: {
            ...escalaBase.ticks,
            callback: v => "R$" + v.toLocaleString("pt-BR")
          }
        }
      }
    }
  });

  // 2. Pizza
  chartPizza = new Chart(document.getElementById("chart-pizza"), {
    type: "doughnut",
    data: {
      labels: ["Entradas", "Saídas"],
      datasets: [{
        data: [totalEntradas, totalSaidas],
        backgroundColor: ["rgba(62,207,142,0.8)", "rgba(240,101,101,0.8)"],
        borderColor:     ["#3ecf8e", "#f06565"],
        borderWidth: 2,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true, position: "bottom",
          labels: { color: "#7a7a85", font: { family: "Outfit", size: 11 }, boxWidth: 12 }
        }
      }
    }
  });

  // 3. Linha — evolução do saldo
  chartLinha = new Chart(document.getElementById("chart-linha"), {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Saldo acumulado",
        data: saldos,
        borderColor: "#e8c96a",
        backgroundColor: "rgba(232,201,106,0.1)",
        borderWidth: 2,
        pointBackgroundColor: "#e8c96a",
        pointRadius: 4,
        tension: 0.35,
        fill: true
      }]
    },
    options: {
      ...optsBase,
      scales: {
        x: { ...escalaBase, ticks: { ...escalaBase.ticks, autoSkip: false, maxRotation: 30 } },
        y: {
          ...escalaBase,
          ticks: {
            ...escalaBase.ticks,
            callback: v => "R$" + v.toLocaleString("pt-BR")
          }
        }
      }
    }
  });
}

// ============================================================
// UTILITÁRIOS
// ============================================================
function fmt(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarMesAno(mesAno) {
  if (!mesAno || mesAno === "0000-00") return "Sem data";
  const [ano, mes] = mesAno.split("-");
  const nomes = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return nomes[parseInt(mes, 10) - 1] + "/" + ano;
}
auth.onAuthStateChanged(user => {
  if (user) {
    document.getElementById("tela-login").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
  }
});
