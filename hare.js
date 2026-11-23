/* HARE RADAR™ · menu, abas, radar, diagnóstico, cookies e eventos */
(() => {
  const S = window.SITE || {};
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduzir = matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.dataLayer = window.dataLayer || [];
  const evento = (nome, extra = {}) => window.dataLayer.push({ event: nome, ...extra });

  /* ── Eventos de clique (prontos para o Google Tag Manager) ──────────────── */
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-evento]");
    if (a) evento("clique_cta", { cta: a.dataset.evento, destino: a.getAttribute("href") || "" });
  });

  /* ── Menu do celular ───────────────────────────────────────────────────── */
  const botaoMenu = $(".menu-botao"), menu = $("#menu");
  if (botaoMenu && menu) {
    const alternar = (abrir) => {
      menu.classList.toggle("aberto", abrir);
      botaoMenu.setAttribute("aria-expanded", abrir);
      botaoMenu.setAttribute("aria-label", abrir ? "Fechar menu" : "Abrir menu");
      document.body.style.overflow = abrir ? "hidden" : "";
      document.body.classList.toggle("menu-aberto", abrir);
    };
    botaoMenu.addEventListener("click", () => alternar(!menu.classList.contains("aberto")));
    menu.addEventListener("click", (e) => { if (e.target.closest("a")) alternar(false); });
    addEventListener("keydown", (e) => { if (e.key === "Escape") alternar(false); });
  }

  /* ── Abas dos pilares ──────────────────────────────────────────────────── */
  const abas = $$('.abas [role="tab"]');
  const ativarAba = (aba, foco) => {
    abas.forEach((b) => {
      const sel = b === aba;
      b.setAttribute("aria-selected", sel);
      b.tabIndex = sel ? 0 : -1;
      $("#" + b.getAttribute("aria-controls")).hidden = !sel;
    });
    if (foco) aba.focus();
    evento("aba_pilar", { pilar: aba.textContent.trim() });
  };
  abas.forEach((b, i) => {
    b.addEventListener("click", () => ativarAba(b));
    b.addEventListener("keydown", (e) => {
      const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (d) { e.preventDefault(); ativarAba(abas[(i + d + abas.length) % abas.length], true); }
    });
  });

  /* ── Radar: os 5 estágios acendem em sequência ─────────────────────────── */
  const estagios = $$(".estagios li"), blips = $$(".blip"), status = $(".radar-status");
  if (estagios.length) {
    let atual = 0, timer = null, manual = false;
    const marcar = (i) => {
      atual = i;
      estagios.forEach((li, k) => li.classList.toggle("ativo", k === i));
      blips.forEach((b, k) => b.classList.toggle("ativo", k === i));
      if (status) status.textContent = `SINAL 0${i + 1} · ${estagios[i].querySelector("strong").textContent.toUpperCase()}`;
    };
    const ciclo = () => { if (!manual) marcar((atual + 1) % estagios.length); };
    marcar(0);
    estagios.forEach((li, i) => li.querySelector("button").addEventListener("click", () => {
      manual = true; clearInterval(timer); marcar(i); evento("radar_estagio", { estagio: i + 1 });
    }));
    if (!reduzir) {
      new IntersectionObserver(([e]) => {
        clearInterval(timer);
        if (e.isIntersecting && !manual) timer = setInterval(ciclo, 3200);
      }, { threshold: 0.3 }).observe($("#radar"));
    }
  }

  /* ── Diagnóstico HARE RADAR™ ───────────────────────────────────────────── */
  const quiz = $(".quiz");
  if (quiz) {
    const etapas = $$(".quiz-etapa", quiz);
    const barra = $(".quiz-progresso span", quiz), contador = $(".quiz-contador", quiz), aviso = $(".quiz-aviso", quiz);
    const voltar = $('[data-quiz="voltar"]', quiz), avancar = $('[data-quiz="avancar"]', quiz);
    const resultado = $(".resultado");
    let passo = 0, iniciou = false;

    const mostrar = (i) => {
      passo = i;
      etapas.forEach((f, k) => (f.hidden = k !== i));
      barra.style.width = `${((i + 1) / etapas.length) * 100}%`;
      contador.textContent = `Pergunta ${i + 1} de ${etapas.length}`;
      voltar.disabled = i === 0;
      avancar.textContent = i === etapas.length - 1 ? "Ver diagnóstico" : "Próxima";
      aviso.textContent = "";
    };
    const respondida = (f) => $$("input", f).some((x) => x.checked);
    const valor = (nome) => $$(`[name="${nome}"]:checked`, quiz).map((x) => x.value);

    const ir = () => {
      if (!respondida(etapas[passo])) { aviso.textContent = "Escolha uma opção para continuar."; return; }
      if (!iniciou) { iniciou = true; evento("diagnostico_inicio"); }
      if (passo < etapas.length - 1) {
        mostrar(passo + 1);
        if (innerWidth < 760) quiz.scrollIntoView({ behavior: reduzir ? "auto" : "smooth", block: "start" });
      } else concluir();
    };
    avancar.addEventListener("click", ir);
    voltar.addEventListener("click", () => passo > 0 && mostrar(passo - 1));
    // Em perguntas de escolha única sem campo de texto, avança sozinho
    etapas.forEach((f) => {
      if (f.hasAttribute("data-multi") || $("textarea", f)) return;
      f.addEventListener("change", () => setTimeout(ir, 280));
    });

    const CENARIOS = {
      A: {
        titulo: "Cenário A · Aquisição não estruturada",
        texto: "Sua empresa ainda não possui uma estrutura consistente de aquisição digital.",
        oportunidade: "Estruturar a oferta, compreender a demanda, definir os canais e construir um caminho de conversão.",
        passos: ["Definir oferta e público.", "Mapear demanda e concorrência.", "Estruturar a página e o rastreamento.", "Planejar campanhas."],
      },
      B: {
        titulo: "Cenário B · Aquisição em operação",
        texto: "Sua empresa já possui campanhas ou canais de aquisição, mas pode haver oportunidades de melhoria na estrutura.",
        oportunidade: "Avaliar a performance, a relevância das campanhas, as páginas, o rastreamento e a qualidade dos contatos.",
        passos: ["Auditar campanhas.", "Avaliar termos, públicos e criativos.", "Revisar conversões e páginas.", "Priorizar testes."],
      },
      C: {
        titulo: "Cenário C · Aquisição com potencial de evolução",
        texto: "Sua empresa já possui uma estrutura digital e sinais de aquisição. O próximo passo é identificar oportunidades de refinamento.",
        oportunidade: "Aprimorar a mensuração, o processo comercial, a eficiência e a estrutura de crescimento.",
        passos: ["Avaliar a qualidade dos contatos.", "Identificar pontos de perda.", "Refinar campanhas e páginas.", "Planejar evolução e testes."],
      },
      D: {
        titulo: "Cenário D · Aquisição sem visibilidade suficiente",
        texto: "Sua empresa recebe contatos, mas ainda não tem informações suficientes para entender a origem e a qualidade das oportunidades.",
        oportunidade: "Estruturar o rastreamento, organizar os contatos e conectar o marketing ao atendimento.",
        passos: ["Identificar as principais ações comerciais.", "Configurar a mensuração.", "Organizar os canais de contato.", "Criar um processo de acompanhamento."],
      },
    };

    // Critérios explícitos (sem pontuação): cada regra lê respostas específicas
    const classificar = (r) => {
      const semEstrutura = r.publicidade[0] === "Nunca anunciei"
        || r.aquisicao.includes("Sem estrutura definida")
        || r.conversao[0] === "Sem processo organizado";
      const anuncia = ["Anuncio no Google Ads", "Anuncio no Meta Ads", "Anuncio em várias plataformas"].includes(r.publicidade[0]);
      const semVisibilidade = ["Sei quantos, não a origem", "Sem rastreamento", "Não sei"].includes(r.mensuracao[0]);
      if (semEstrutura && !anuncia) return "A";
      if (semVisibilidade) return "D";
      if (anuncia && r.mensuracao[0] === "Acompanho as principais métricas") return "C";
      return "B";
    };

    const concluir = () => {
      const r = {};
      ["oferta", "mercado", "cliente", "aquisicao", "publicidade", "conversao", "mensuracao", "objetivo"].forEach((k) => (r[k] = valor(k)));
      const textoOferta = (quiz.elements.oferta_texto.value || "").trim();
      const chave = classificar(r), c = CENARIOS[chave];

      $(".resultado-titulo").textContent = c.titulo;
      $(".resultado-texto").textContent = c.texto;
      $(".resultado-oportunidade").textContent = c.oportunidade;
      $(".resultado-passos").innerHTML = "";
      c.passos.forEach((p) => { const li = document.createElement("li"); li.textContent = p; $(".resultado-passos").append(li); });

      const resumo = [
        `Olá! Fiz o Diagnóstico HARE RADAR™ no site e quero uma análise estratégica.`,
        ``,
        `Resultado: ${c.titulo}`,
        `Oferta: ${r.oferta.join(", ")}${textoOferta ? ` (${textoOferta})` : ""}`,
        `Atendimento: ${r.mercado.join(", ")}`,
        `Cliente: ${r.cliente.join(", ")}`,
        `Canais hoje: ${r.aquisicao.join(", ")}`,
        `Anúncios: ${r.publicidade.join(", ")}`,
        `Contato: ${r.conversao.join(", ")}`,
        `Mensuração: ${r.mensuracao.join(", ")}`,
        `Objetivo: ${r.objetivo.join(", ")}`,
      ].join("\n");
      window.HARE_DIAGNOSTICO = resumo;
      const num = String((S.whatsapp && S.whatsapp.numero) || "").replace(/\D/g, "");
      $("[data-resultado-whats]").href = `https://wa.me/${num}?text=${encodeURIComponent(resumo)}`;

      quiz.hidden = true;
      resultado.hidden = false;
      resultado.focus({ preventScroll: true });
      resultado.scrollIntoView({ behavior: reduzir ? "auto" : "smooth", block: "start" });
      evento("diagnostico_concluido", { cenario: chave, objetivo: r.objetivo[0] || "" });
    };

    $('[data-quiz="refazer"]').addEventListener("click", () => {
      quiz.reset(); resultado.hidden = true; quiz.hidden = false; window.HARE_DIAGNOSTICO = ""; mostrar(0);
    });
    mostrar(0);
  }

  /* ── Cookies (LGPD) ────────────────────────────────────────────────────── */
  const CHAVE = "hare_cookies";
  const aviso = $(".cookies");
  const aplicar = (escolha) => {
    window.HARE_CONSENTIMENTO = escolha;
    evento("consentimento", { analytics: escolha === "aceito" ? "granted" : "denied", ads: escolha === "aceito" ? "granted" : "denied" });
    // Para ativar o Google Tag Manager depois, carregue o container aqui somente quando escolha === "aceito".
  };
  let salvo = null;
  try { salvo = localStorage.getItem(CHAVE); } catch (e) {}
  if (salvo) aplicar(salvo);
  else if (aviso) {
    // Mostra o aviso só depois da abertura (ou após 20 s), para não cobrir o texto principal
    const cineEl = $(".cine");
    let mostrado = false;
    const mostrar = () => { if (mostrado) return; mostrado = true; aviso.hidden = false; removeEventListener("scroll", checar); };
    const checar = () => { if (!cineEl || cineEl.getBoundingClientRect().bottom < innerHeight * 0.9) mostrar(); };
    addEventListener("scroll", checar, { passive: true });
    setTimeout(mostrar, 20000);
    checar();
  }
  $$("[data-cookies]").forEach((b) => b.addEventListener("click", () => {
    const escolha = b.dataset.cookies === "aceitar" ? "aceito" : "essenciais";
    try { localStorage.setItem(CHAVE, escolha); } catch (e) {}
    aviso.hidden = true; aplicar(escolha);
  }));
  $$("[data-cookies-abrir]").forEach((b) => b.addEventListener("click", () => (aviso.hidden = false)));
})();
