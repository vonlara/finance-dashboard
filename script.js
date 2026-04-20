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
  event.currentTarget.classList.add("active");

  if (nome === "graficos") renderizarGraficos();
}
