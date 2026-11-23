(() => {
  const S = window.SITE || {};
  const reduzir = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const celular = matchMedia("(max-width: 760px)").matches;


  /* ── Rolagem que toca o vídeo ─────────────────────────────────────────── */
  const cine = document.querySelector(".cine");
  const canvas = cine && cine.querySelector(".cine-canvas");
  if (cine && canvas && S.frames && S.frames.total) {
    const ctx = canvas.getContext("2d");
    const total = S.frames.total;
    const padrao = celular ? S.frames.mobile : S.frames.desktop;
    const src = (i) => padrao.replace("{n}", String(i + 1).padStart(4, "0"));
    const quadros = new Array(total);
    const momentos = [...cine.querySelectorAll(".momento")];
    let alvo = 0, atual = 0, desenhado = -1;

    const carregar = (i) => {
      if (quadros[i]) return quadros[i];
      const img = new Image();
      img.decoding = "async";
      img.src = src(i);
      img.onload = () => { if (Math.round(atual) === i || desenhado === -1) desenhar(i, true); };
      return (quadros[i] = img);
    };

    // Carrega em passadas (1 a cada 8, depois 1 a cada 4…) para cobrir o filme inteiro cedo
    carregar(0);
    if (!reduzir) {
      const fila = [];
      for (const passo of [8, 4, 2, 1]) for (let i = 0; i < total; i += passo) if (!fila.includes(i)) fila.push(i);
      let k = 0, cineNaTela = true;
      // Pausa o pré-carregamento quando a abertura sai da tela: as imagens das seções ganham prioridade
      new IntersectionObserver(([e]) => { cineNaTela = e.isIntersecting; }, { rootMargin: "50% 0px" }).observe(cine);
      const lote = () => {
        if (!cineNaTela) return setTimeout(lote, 400);
        for (let n = 0; n < 4 && k < fila.length; n++) carregar(fila[k++]);
        if (k < fila.length) setTimeout(lote, 60);
      };
      lote();
    }

    const pronto = (i) => quadros[i] && quadros[i].complete && quadros[i].naturalWidth;
    const maisProximo = (i) => {
      for (let d = 0; d < total; d++) {
        if (pronto(i - d)) return i - d;
        if (pronto(i + d)) return i + d;
      }
      return -1;
    };

    // Celular em pé: o filme aparece INTEIRO (sem cortar as laterais), no topo da tela,
    // com uma cópia desfocada dele preenchendo o fundo. O texto fica logo abaixo.
    const fundo = cine.querySelector(".cine-fundo");
    const fctx = fundo && fundo.getContext("2d");
    const telaEmPe = matchMedia("(max-width: 900px) and (orientation: portrait)");
    let emPe = telaEmPe.matches, dpr = 1;

    const ajustar = () => {
      emPe = telaEmPe.matches;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      if (fundo) { // fundo em baixa resolução: o desfoque é feito pelo CSS (GPU)
        fundo.width = Math.max(1, Math.round(fundo.clientWidth / 4));
        fundo.height = Math.max(1, Math.round(fundo.clientHeight / 4));
      }
      cine.classList.toggle("cine--em-pe", emPe);
      desenhado = -1;
      desenhar(Math.round(atual), true);
    };

    function desenhar(i, forcar) {
      const j = maisProximo(i);
      if (j < 0 || (j === desenhado && !forcar)) return;
      const img = quadros[j];
      const iw = img.naturalWidth, ih = img.naturalHeight;
      const cw = canvas.width, ch = canvas.height;
      if (!emPe) {
        const escala = Math.max(cw / iw, ch / ih); // "cover"
        const w = iw * escala, h = ih * escala;
        ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
      } else {
        // Fundo: cópia "cover" desfocada
        if (fctx) {
          const fe = Math.max(fundo.width / iw, fundo.height / ih);
          fctx.drawImage(img, (fundo.width - iw * fe) / 2, (fundo.height - ih * fe) / 2, iw * fe, ih * fe);
        }
        // Frente: filme na largura da tela (zoom de 20%: corta só 8% de cada lateral)
        const escala = (cw / iw) * 1.2;
        const w = iw * escala, h = ih * escala;
        const x = (cw - w) / 2;
        // Centraliza o conjunto filme + texto (≈260px de texto abaixo do filme)
        const y = Math.max(72 * dpr, (ch - h - 260 * dpr) / 2);
        canvas.dataset.faixa = `${Math.round((y + h) / dpr)}`;
        ctx.clearRect(0, 0, cw, ch);
        ctx.drawImage(img, x, y, w, h);
        // Dissolve as bordas de cima e de baixo no fundo (sem linha reta)
        ctx.globalCompositeOperation = "destination-in";
        const g = ctx.createLinearGradient(0, y, 0, y + h);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(0.12, "#000");
        g.addColorStop(0.86, "#000");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, cw, ch);
        ctx.globalCompositeOperation = "source-over";
      }
      desenhado = j;
    }

    const progresso = () => {
      const r = cine.getBoundingClientRect();
      const curso = cine.offsetHeight - innerHeight;
      return Math.min(1, Math.max(0, -r.top / (curso || 1)));
    };

    const atualizarMomentos = (p) => {
      for (const m of momentos) {
        const de = parseFloat(m.dataset.de || 0), ate = parseFloat(m.dataset.ate || 1);
        m.classList.toggle("ativo", p >= de && (p < ate || (ate >= 1 && p >= 1)));
      }
      cine.classList.toggle("andou", p > 0.02);
    };

    const quadro = () => {
      alvo = progresso() * (total - 1);
      atual += (alvo - atual) * 0.18; // suaviza: sensação de filme, não de slide
      if (Math.abs(alvo - atual) < 0.05) atual = alvo;
      desenhar(Math.round(atual));
      atualizarMomentos(atual / (total - 1));
      requestAnimationFrame(quadro);
    };

    addEventListener("resize", ajustar);
    ajustar();
    if (reduzir) atualizarMomentos(0);
    else requestAnimationFrame(quadro);
  }

  /* ── Parallax leve nas artes ──────────────────────────────────────────── */
  const artes = (reduzir || matchMedia("(max-width: 860px)").matches) ? [] : [...document.querySelectorAll(".arte")];
  if (artes.length) {
    const mover = () => {
      for (const a of artes) {
        const r = a.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) continue;
        const c = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
        a.style.transform = `translate3d(0, ${(c * -60).toFixed(1)}px, 0) scale(1.08)`;
      }
    };
    addEventListener("scroll", () => requestAnimationFrame(mover), { passive: true });
    mover();
  }

  /* ── Topo, revelar e ano ──────────────────────────────────────────────── */
  const topo = document.querySelector(".topo");
  const whats = document.querySelector(".whats");
  let formNaTela = false; // o botão flutuante se recolhe para não cobrir o "Enviar"
  const aoRolar = () => {
    topo && topo.classList.toggle("rolou", scrollY > 40);
    whats && whats.classList.toggle("visivel", scrollY > innerHeight * 0.6 && !formNaTela);
  };
  const formEl = document.querySelector(".form");
  if (formEl) new IntersectionObserver(([e]) => { formNaTela = e.isIntersecting; aoRolar(); }).observe(formEl);
  addEventListener("scroll", aoRolar, { passive: true });
  aoRolar();

  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("visto"); io.unobserve(e.target); }
  }), { threshold: 0.18 });
  document.querySelectorAll(".revelar").forEach((el) => io.observe(el));
  document.querySelectorAll("[data-ano]").forEach((el) => (el.textContent = new Date().getFullYear()));

  /* ── WhatsApp ─────────────────────────────────────────────────────────── */
  if (S.whatsapp) {
    const num = String(S.whatsapp.numero || "").replace(/\D/g, "");
    const link = `https://wa.me/${num}?text=${encodeURIComponent(S.whatsapp.mensagem || "")}`;
    document.querySelectorAll("[data-whats-link]").forEach((a) => (a.href = link));
  }

  /* ── Formulário → e-mail ──────────────────────────────────────────────── */
  const form = document.querySelector(".form");
  if (form && S.contato) {
    const status = form.querySelector(".form-status");
    const botao = form.querySelector("button[type=submit]");
    const avisar = (txt, tipo) => { status.textContent = txt; status.className = `form-status campo--inteiro ${tipo || ""}`; };

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (form.elements._honey.value) return; // robô
      let valido = true;
      form.querySelectorAll("[required]").forEach((c) => {
        const ok = c.type === "checkbox" ? c.checked
          : c.type === "email" ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.value) : c.value.trim().length > 1;
        (c.closest(".campo") || c.closest(".aceite")).classList.toggle("erro", !ok);
        if (!ok) valido = false;
      });
      if (!valido) return avisar("Confira os campos destacados.", "falha");

      const dados = Object.fromEntries(new FormData(form));
      delete dados._honey;
      dados.aceite = "Sim, concordou com a política de privacidade";
      if (window.HARE_DIAGNOSTICO) dados.diagnostico = window.HARE_DIAGNOSTICO;
      const assunto = S.contato.assunto || `Novo contato pelo site ${S.nome || ""}`;
      let url, corpo;
      if (S.contato.web3formsChave) {
        url = "https://api.web3forms.com/submit";
        corpo = { access_key: S.contato.web3formsChave, subject: assunto, from_name: S.nome, ...dados };
      } else {
        url = `https://formsubmit.co/ajax/${encodeURIComponent(S.contato.email)}`;
        corpo = { _subject: assunto, _template: "table", _captcha: "false", ...dados };
      }

      botao.disabled = true;
      avisar("Enviando…");
      try {
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(corpo),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j.success === false || j.success === "false") throw new Error(j.message || r.status);
        form.reset();
        (window.dataLayer = window.dataLayer || []).push({ event: "form_enviado" });
        avisar("Recebemos seu contato. Em breve falamos com você.", "ok");
      } catch (e) {
        console.warn("Falha no envio do formulário:", e);
        avisar("Não foi possível enviar agora. Chame a gente no WhatsApp.", "falha");
      } finally {
        botao.disabled = false;
      }
    });
  }
})();
