const categories = {
  legado: {
    number: "01",
    title: "Legado Educacional",
    text:
      "Honra ao mérito para professores com décadas de dedicação e história na educação de Bagé e região.",
    seek: "O que se busca: trajetória, memória, serviço e inspiração.",
  },
  engajamento: {
    number: "02",
    title: "Mestre do Engajamento",
    text:
      "Professores que tornam o aprendizado agradável, lúdico, estimulante e conectado ao prazer de descobrir.",
    seek: "O que se busca: métodos vivos, vínculo com alunos e combate ao desinteresse escolar.",
  },
  tecnologia: {
    number: "03",
    title: "Tecnologia com Propósito",
    text:
      "Uso ético e inteligente de IA, gamificação, AVA e recursos digitais com metodologia pedagógica clara.",
    seek: "O que se busca: inovação com resultado prático, intencionalidade e impacto mensurável.",
  },
  inclusao: {
    number: "04",
    title: "Impacto Social e Inclusão",
    text:
      "Projetos que promovem acessibilidade e integração de estudantes em situação de vulnerabilidade.",
    seek: "O que se busca: barreiras rompidas, pertencimento e transformação social.",
  },
};

const timeline = [
  "Lançamento oficial em maio, com divulgação do prêmio e abertura do formulário digital.",
  "Recebimento das indicações da comunidade, instituições e profissionais, com triagem inicial.",
  "Avaliação do júri técnico, revelação dos vencedores e cerimônia de entrega dos troféus em junho.",
];

const header = document.querySelector("[data-header]");
const menuButton = document.querySelector("[data-menu-button]");
const nav = document.querySelector("[data-nav]");
const tabs = document.querySelectorAll("[data-category]");
const panel = document.querySelector("[data-category-panel]");
const timelineButtons = document.querySelectorAll("[data-step]");
const timelineDetail = document.querySelector("[data-timeline-detail]");
const form = document.querySelector("[data-form]");
const formStatus = document.querySelector("[data-form-status]");
const submitButton = document.querySelector("[data-submit-button]");
const hero = document.querySelector(".hero");
const floatCard = document.querySelector("[data-float-card]");
const magneticItems = document.querySelectorAll(".magnetic");
const scrollProgress = document.querySelector("[data-scroll-progress]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let smoothScrollTarget = window.scrollY;

function setHeaderState() {
  header.classList.toggle("scrolled", window.scrollY > 24);
}

function setCategory(key) {
  const data = categories[key];
  panel.classList.add("switching");

  window.setTimeout(() => {
    panel.innerHTML = `
      <p class="panel-number">${data.number}</p>
      <div>
        <h3>${data.title}</h3>
        <p>${data.text}</p>
        <strong>${data.seek}</strong>
      </div>
    `;
    panel.classList.remove("switching");
  }, 180);

  tabs.forEach((tab) => {
    const active = tab.dataset.category === key;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
}

function moveHeroElements() {
  if (!hero) return;
  const y = Math.min(window.scrollY, hero.offsetHeight);
  hero.style.setProperty("--stats-parallax", `${y * -0.035}px`);
}

function updateScrollProgress() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
  scrollProgress?.style.setProperty("--scroll-progress", progress.toFixed(4));
  smoothScrollTarget = window.scrollY;
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function animateScrollTo(targetY, duration = 520) {
  if (reducedMotion) {
    window.scrollTo(0, targetY);
    return;
  }

  const startY = window.scrollY;
  const distance = targetY - startY;
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    window.scrollTo(0, startY + distance * easeInOutCubic(progress));
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}


function setTimeline(index) {
  timelineButtons.forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.step) === index);
  });
  timelineDetail.textContent = timeline[index];
}

menuButton.addEventListener("click", () => {
  nav.classList.toggle("open");
  document.body.classList.toggle("menu-open", nav.classList.contains("open"));
});

nav.addEventListener("click", (event) => {
  if (event.target.matches("a")) {
    const target = document.querySelector(event.target.getAttribute("href"));
    if (target) {
      event.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 82;
      smoothScrollTarget = top;
      animateScrollTo(top);
      history.pushState(null, "", event.target.getAttribute("href"));
    }

    nav.classList.remove("open");
    document.body.classList.remove("menu-open");
  }
});

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  if (link.closest("[data-nav]")) return;

  link.addEventListener("click", (event) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;
    event.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - 82;
    smoothScrollTarget = top;
    animateScrollTo(top);
    history.pushState(null, "", link.getAttribute("href"));
  });
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => setCategory(tab.dataset.category));
});

timelineButtons.forEach((button) => {
  button.addEventListener("click", () => setTimeline(Number(button.dataset.step)));
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());

  setFormState("sending", "Enviando indicação...");

  try {
    const response = await fetch("/api/indicacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await response.json();

    if (!response.ok || !result.ok) {
      const details = result.fields ? Object.values(result.fields).join(" ") : result.error;
      throw new Error(details || "Não foi possível enviar a indicação.");
    }

    setFormState("success", `Indicação recebida com sucesso. Protocolo: ${result.id}`);
    form.reset();
  } catch (error) {
    const subject = encodeURIComponent(`Indicação - Prêmio IDEAU 2026 - ${data.nome}`);
    const body = encodeURIComponent(
      [
        `Nome do indicado: ${data.nome}`,
        `Categoria: ${data.categoria}`,
        `Indicado por: ${data.autor}`,
        `E-mail: ${data.email || ""}`,
        `Telefone: ${data.telefone || ""}`,
        `Instituição: ${data.instituicao || ""}`,
        `Cidade: ${data.cidade || ""}`,
        "",
        "Motivo:",
        data.motivo,
      ].join("\n"),
    );

    setFormState(
      "error",
      `Servidor indisponível agora. <a href="mailto:?subject=${subject}&body=${body}">Enviar por e-mail</a>`,
    );
    console.warn(error);
  }
});

function setFormState(type, message) {
  formStatus.className = `form-status ${type}`;
  formStatus.innerHTML = message;
  submitButton.disabled = type === "sending";
  submitButton.textContent = type === "sending" ? "Enviando..." : "Enviar indicação";
}

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 },
);

document.querySelectorAll(".reveal").forEach((element) => {
  const siblings = [...element.parentElement.querySelectorAll(".reveal")];
  const index = Math.max(0, siblings.indexOf(element));
  element.style.setProperty("--reveal-delay", `${Math.min(index * 70, 280)}ms`);
  revealObserver.observe(element);
});

window.addEventListener("scroll", setHeaderState, { passive: true });
window.addEventListener("scroll", moveHeroElements, { passive: true });
window.addEventListener("scroll", updateScrollProgress, { passive: true });

if (!reducedMotion && hero && floatCard) {
  hero.addEventListener("mousemove", (event) => {
    const rect = hero.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    floatCard.style.transform = `rotateY(${x * 10}deg) rotateX(${y * -10}deg) translateY(${y * -8}px)`;
  });

  hero.addEventListener("mouseleave", () => {
    floatCard.style.transform = "";
  });
}

if (!reducedMotion) {
  magneticItems.forEach((item) => {
    item.addEventListener("mousemove", (event) => {
      const rect = item.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      item.style.transform = `translate(${x * 0.12}px, ${y * 0.18}px)`;
    });

    item.addEventListener("mouseleave", () => {
      item.style.transform = "";
    });
  });
}

setHeaderState();
moveHeroElements();
updateScrollProgress();
