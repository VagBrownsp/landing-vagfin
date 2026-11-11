/* ==========================================================================
   Simulação de financiamento — script.js
   Seções: 1 Configuração · 2 Utilitários · 3 Campos dinâmicos · 4 Máscaras
           5 Validações · 6 Mensagem · 7 Envio
   ========================================================================== */

/* ---------- 1. Configuração ---------- */
const DEST = "5512997479192";   // WhatsApp que recebe o resultado (DDI + DDD + número)
const ENTRADA_MIN = 0.20;       // entrada mínima: 20% do valor do imóvel

const UFS = "AC,AL,AM,AP,BA,CE,DF,ES,GO,MA,MG,MS,MT,PA,PB,PE,PI,PR,RJ,RN,RO,RR,RS,SC,SE,SP,TO".split(",");

const PROFS = [
  "Administrador(a)", "Advogado(a)", "Aposentado(a)/Pensionista", "Arquiteto(a)",
  "Assistente administrativo", "Atendente", "Autônomo(a)", "Auxiliar de serviços gerais",
  "Balconista", "Bancário(a)", "Cabeleireiro(a)/Barbeiro(a)", "Comerciante", "Contador(a)",
  "Cozinheiro(a)", "Dentista", "Designer", "Diarista", "Eletricista", "Empresário(a)/Sócio(a)",
  "Enfermeiro(a)", "Engenheiro(a)", "Estudante", "Farmacêutico(a)", "Funcionário(a) público(a)",
  "Gerente", "Jornalista", "Mecânico(a)", "Médico(a)", "Microempreendedor(a) (MEI)", "Motorista",
  "Motorista de aplicativo", "Militar", "Pedreiro(a)/Construção civil", "Professor(a)",
  "Programador(a)/TI", "Psicólogo(a)", "Representante comercial", "Segurança/Vigilante",
  "Técnico(a) de enfermagem", "Vendedor(a)"
];

/* ---------- 2. Utilitários ---------- */
const $ = id => document.getElementById(id);
const val = nome => { const r = document.querySelector(`input[name="${nome}"]:checked`); return r ? r.value : ""; };
const num = s => parseInt((s || "").replace(/\D/g, "") || "0", 10) / 100;           // "R$ 1.234,56" -> 1234.56
const brl = n => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const bonito = n => n.toLowerCase()                                                  // "SÃO JOSÉ" -> "São José"
  .replace(/(^|\s)(\S)/g, (m, a, b) => a + b.toUpperCase())
  .replace(/\s(De|Da|Do|Das|Dos|E)(?=\s)/g, x => x.toLowerCase());

/* ---------- 3. Campos dinâmicos ---------- */

// 3.1 Botões Sim/Não (ou opções definidas em data-o)
document.querySelectorAll(".yn").forEach(g => {
  const opcoes = (g.dataset.o || "Sim,Não").split(",");
  g.innerHTML = opcoes.map(o => `<label><input type="radio" name="${g.dataset.n}" value="${o}">${o}</label>`).join("");
});

// 3.2 Campos que aparecem conforme a resposta
function mostrarSe(nome, boxId, valor) {
  document.querySelectorAll(`input[name="${nome}"]`)
    .forEach(r => r.onchange = () => $(boxId).classList.toggle("hide", val(nome) !== valor));
}
mostrarSe("compor", "boxOutra", "Sim");
mostrarSe("fgts", "boxSaldo", "Sim");

// 3.3 Profissão (lista + "Outros")
$("prof").innerHTML = '<option value="">Selecione</option>'
  + PROFS.map(p => `<option>${p}</option>`).join("")
  + '<option value="Outros">Outros</option>';
$("prof").onchange = () => $("boxProf").classList.toggle("hide", $("prof").value !== "Outros");
const profVal = () => $("prof").value === "Outros" ? $("profOutra").value.trim() : $("prof").value;

// 3.4 Estado -> Cidade (API do IBGE, com BrasilAPI como reserva)
const cacheCidades = {};

async function buscarCidades(uf) {
  if (cacheCidades[uf]) return cacheCidades[uf];
  const fontes = [
    [`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`, j => j.map(m => m.nome)],
    [`https://brasilapi.com.br/api/ibge/municipios/v1/${uf}?providers=dados-abertos-br,gov,wikipedia`, j => j.map(m => bonito(m.nome))]
  ];
  for (const [url, extrair] of fontes) {
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      const lista = extrair(await r.json());
      if (lista.length) return cacheCidades[uf] = lista.sort((a, b) => a.localeCompare(b, "pt-BR"));
    } catch (e) { /* tenta a próxima fonte */ }
  }
  return null;
}

function criarSeletorLocal(id) {
  $(id).innerHTML = `<select id="${id}_uf"><option value="">Estado</option>${UFS.map(u => `<option>${u}</option>`).join("")}</select>
<select id="${id}_c" disabled><option value="">Escolha o estado primeiro</option></select>
<input id="${id}_t" type="text" class="hide" placeholder="Digite a cidade">
<p class="hint hide" id="${id}_m"></p>`;

  const uf = $(id + "_uf"), cidade = $(id + "_c"), texto = $(id + "_t"), aviso = $(id + "_m");

  uf.onchange = async () => {
    const u = uf.value;
    texto.classList.add("hide"); texto.value = ""; aviso.classList.add("hide"); cidade.classList.remove("hide");
    if (!u) { cidade.disabled = true; cidade.innerHTML = '<option value="">Escolha o estado primeiro</option>'; return; }

    cidade.disabled = true; cidade.innerHTML = '<option value="">Carregando cidades...</option>';
    const lista = await buscarCidades(u);
    if (uf.value !== u) return; // trocou de estado enquanto carregava

    if (lista) {
      cidade.innerHTML = '<option value="">Selecione a cidade</option>' + lista.map(n => `<option>${n}</option>`).join("");
      cidade.disabled = false;
    } else {
      cidade.classList.add("hide"); texto.classList.remove("hide");
      aviso.textContent = "Não foi possível carregar a lista de cidades agora. Digite o nome da cidade.";
      aviso.classList.remove("hide");
    }
  };
}
const localVal = id => {
  const u = $(id + "_uf").value, t = $(id + "_t");
  const cidade = t.classList.contains("hide") ? $(id + "_c").value : t.value.trim();
  return u && cidade ? `${cidade} - ${u}` : "";
};
["nat", "mora", "imv"].forEach(criarSeletorLocal);

/* ---------- 4. Máscaras ---------- */
$("cpf").addEventListener("input", e => {
  e.target.value = e.target.value.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  e.target.classList.remove("bad"); $("cpfErr").textContent = "";
});

$("nasc").addEventListener("input", e => {
  const apagando = (e.inputType || "").startsWith("delete");   // não recoloca a barra ao apagar
  const d = e.target.value.replace(/\D/g, "").slice(0, 8);
  let r = d;
  if (d.length > 4)      r = d.slice(0, 2) + "/" + d.slice(2, 4) + "/" + d.slice(4);
  else if (d.length > 2) r = d.slice(0, 2) + "/" + d.slice(2);
  if ((d.length === 2 || d.length === 4) && !apagando) r += "/";                       // 25 -> 25/ · 2512 -> 25/12/
  e.target.value = r;
  e.target.classList.remove("bad"); $("nascErr").textContent = "";
});

document.querySelectorAll(".m").forEach(el => el.addEventListener("input", e => {
  const d = e.target.value.replace(/\D/g, "");
  e.target.value = d ? brl(parseInt(d, 10) / 100) : "";
}));

/* ---------- 5. Validações ---------- */

// 5.1 CPF (dígitos verificadores)
function cpfOk(c) {
  c = c.replace(/\D/g, "");
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  for (let t = 9; t < 11; t++) {
    let s = 0;
    for (let i = 0; i < t; i++) s += c[i] * (t + 1 - i);
    if ((s * 10 % 11) % 10 != c[t]) return false;
  }
  return true;
}
function checarCpf() {
  const invalido = $("cpf").value && !cpfOk($("cpf").value);
  $("cpf").classList.toggle("bad", !!invalido);
  $("cpfErr").textContent = invalido ? "CPF inválido. Confira os números." : "";
  return !invalido;
}
$("cpf").addEventListener("blur", checarCpf);

// 5.2 Data de nascimento (dd/mm/aaaa, data real, entre 1900 e hoje)
function dataOk(s) {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return false;
  const d = +m[1], mes = +m[2], a = +m[3], dt = new Date(a, mes - 1, d);
  return dt.getFullYear() === a && dt.getMonth() === mes - 1 && dt.getDate() === d && a >= 1900 && dt <= new Date();
}
function checarNasc() {
  const invalido = $("nasc").value && !dataOk($("nasc").value);
  $("nasc").classList.toggle("bad", !!invalido);
  $("nascErr").textContent = invalido ? "Data inválida. Use o formato dd/mm/aaaa." : "";
  return !invalido;
}
$("nasc").addEventListener("blur", checarNasc);

// 5.3 Entrada mínima
let entradaEditada = false; // enquanto falso, a entrada acompanha o mínimo sugerido
const entradaMinima = () => Math.round(num($("valor").value) * ENTRADA_MIN * 100) / 100;

function checarEntrada() {
  const min = entradaMinima();
  const abaixo = min > 0 && $("entrada").value && num($("entrada").value) < min;
  $("entrada").classList.toggle("bad", !!abaixo);
  $("entErr").textContent = abaixo ? `A entrada deve ser de no mínimo ${brl(min)} (${ENTRADA_MIN * 100}% do imóvel).` : "";
  return !abaixo;
}
$("valor").addEventListener("input", () => {
  const min = entradaMinima();
  $("minEnt").textContent = min > 0
    ? `Entrada mínima (${ENTRADA_MIN * 100}%): ${brl(min)}`
    : `Informe o valor do imóvel para calcular a entrada mínima (${ENTRADA_MIN * 100}%).`;
  if (!entradaEditada) $("entrada").value = min > 0 ? brl(min) : "";
  checarEntrada();
});
$("entrada").addEventListener("input", () => { entradaEditada = true; checarEntrada(); });

/* ---------- 6. Mensagem do WhatsApp ---------- */
function montarMensagem() {
  const simNao = (nome, extra) => val(nome) + (val(nome) === "Sim" && extra ? "\n" + extra : "");
  return `🏠 *DADOS PARA SIMULAÇÃO*

*1. DADOS PESSOAIS*
CPF: ${$("cpf").value}
Nascimento: ${$("nasc").value}
Naturalidade: ${localVal("nat")}
Estado civil: ${$("civil").value}
Cidade onde mora: ${localVal("mora")}

*2. RENDA*
Renda bruta: ${$("renda").value}
Profissão/atividade: ${profVal()}
Vai compor renda? ${simNao("compor", "Renda da outra pessoa: " + $("outra").value)}

*3. IMÓVEL*
Valor do imóvel: ${$("valor").value}
Novo ou usado: ${val("condicao")}
Cidade do imóvel: ${localVal("imv")}
Valor da entrada: ${$("entrada").value}

*4. FGTS*
Possui FGTS? ${simNao("fgts", "Saldo aproximado: " + $("saldo").value)}
3 anos ou mais de carteira assinada, somando os períodos? ${val("tres")}
Já usou FGTS para comprar imóvel? ${val("usou")}

*5. SITUAÇÃO ATUAL*
Possui imóvel residencial em seu nome? ${val("possui")}
Já teve financiamento habitacional? ${val("teve")}
Já recebeu subsídio habitacional? ${val("subs")}`;
}

/* ---------- 7. Envio ---------- */
$("enviar").onclick = () => {
  document.querySelectorAll(".bad").forEach(e => e.classList.remove("bad"));
  let erro = "", foco = null;
  const falha = (el, msg) => { el.classList.add("bad"); erro = erro || msg; foco = foco || el; };

  ["cpf", "nasc", "civil", "renda", "prof", "valor", "entrada"]
    .forEach(id => { if (!$(id).value.trim()) falha($(id), "Preencha todos os campos obrigatórios."); });

  [["nat", "Informe estado e cidade onde nasceu."],
   ["mora", "Informe estado e cidade onde mora."],
   ["imv", "Informe estado e cidade do imóvel."]]
    .forEach(([id, msg]) => { if (!localVal(id)) falha($(id), msg); });

  if ($("nasc").value && !checarNasc()) falha($("nasc"), "Data de nascimento inválida.");
  if ($("prof").value === "Outros" && !$("profOutra").value.trim()) falha($("profOutra"), "Digite sua profissão.");
  if ($("cpf").value && !checarCpf()) falha($("cpf"), "CPF inválido.");
  if (val("compor") === "Sim" && !$("outra").value) falha($("outra"), "Informe a renda da outra pessoa.");
  if (val("fgts") === "Sim" && !$("saldo").value) falha($("saldo"), "Informe o saldo aproximado do FGTS.");
  if ($("valor").value && $("entrada").value && !checarEntrada())
    falha($("entrada"), `A entrada deve ser de no mínimo ${brl(entradaMinima())} (${ENTRADA_MIN * 100}% do imóvel).`);

  const radios = ["compor", "condicao", "fgts", "tres", "usou", "possui", "teve", "subs"];
  if (radios.some(n => !val(n))) erro = erro || "Responda todas as perguntas de Sim/Não.";

  $("geral").textContent = erro;
  if (erro) { (foco || $("geral")).scrollIntoView({ behavior: "smooth", block: "center" }); return; }

  window.open(`https://wa.me/${DEST}?text=${encodeURIComponent(montarMensagem())}`, "_blank");
};
