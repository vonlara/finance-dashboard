// CONFIG FIREBASE - Substitua pelos seus dados reais do console
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO",
};

// INICIALIZA
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ESTADO GLOBAL
let transacoes = [];
let usuarioAtual = null;
let chartBarras = null, chartPizza = null, chartLinha = null;

// ============================================================
// AUTENTICAÇÃO
// ============================================================

function cadastrar() {
  console.log("Botão de cadastrar foi clicado!");
  alert("O JavaScript está funcionando!");
}

function fazerLogout() {
  auth.signOut();
}

// Observador de Login (Controla o que aparece na tela)
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

// ============================================================
// DADOS (FIRESTORE)
// ============================================================

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

// ============================================================
// LÓGICA DO APP
// ============================================================

function adicionarTransacao() {
  const descricao = document.getElementById("descricao").value.trim();
  const valor = parseFloat(document.getElementById("valor").value);
  const tipo = document.getElementById("tipo").value;
  const mesAno = document.getElementById("mes-ano").value;

  if (!descricao || isNaN(valor) || !mesAno) {
    alert("Preencha todos os campos corretamente!");
    return;
  }

  transacoes.push({ descricao, valor, tipo, mesAno });
  salvarDados();
  renderizarTudo();
  
  document.getElementById("descricao").value = "";
  document.getElementById("valor").value = "";
}

function mudarAba(nome) {
  document.querySelectorAll(".aba").forEach(a => a.classList.add("hidden"));
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));

  document.getElementById("aba-" + nome).classList.remove("hidden");
  
  // Ativa a tab correta visualmente
  event.currentTarget.classList.add("active");

  if (nome === "graficos") renderizarGraficos();
}

// Adicione aqui suas funções de renderizarTudo, atualizarResumo, 
// renderizarHistorico e renderizarGraficos que você já tinha, 
// apenas garantindo que não fiquem chaves { } sobrando entre elas.
