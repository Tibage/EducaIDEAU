const categories = {
  legado: {
    number: "01",
    title: "Prêmio Sempre Professor(a)",
    text:
      "Educador(a) com trajetória histórica de dedicação à educação.",
    seek: "O que se busca: trajetória, dedicação, serviço e inspiração.",
  },
  engajamento: {
    number: "02",
    title: "Prêmio Inspiração",
    text:
      "Professor(a) que cria métodos para tornar o aprendizado agradável e estimulante.",
    seek: "O que se busca: métodos vivos, vínculo com alunos e prazer em aprender.",
  },
  tecnologia: {
    number: "03",
    title: "Prêmio Inovação",
    text:
      "Uso inteligente de ferramentas digitais, IA, ambientes virtuais e gamificação com metodologia clara.",
    seek: "O que se busca: inovação com resultados práticos no aprendizado.",
  },
  inclusao: {
    number: "04",
    title: "Prêmio Inclusão Social",
    text:
      "Projetos que promovem a acessibilidade e a integração de alunos em situação de vulnerabilidade.",
    seek: "O que se busca: barreiras rompidas, pertencimento e transformação social.",
  },
};

const timeline = [
  "Lançamento oficial em 24 de agosto, com divulgação do prêmio e abertura do formulário digital.",
  "Inscrições abertas de agosto a setembro, por autoinscrição ou indicação através do site.",
  "Cerimônia em 22 de outubro de 2026, com noite especial para celebrar histórias inspiradoras.",
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
const phoneInput = form.querySelector('input[name="telefone"]');
const hero = document.querySelector(".hero");
const floatCard = document.querySelector("[data-float-card]");
const scrollProgress = document.querySelector("[data-scroll-progress]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let smoothScrollTarget = window.scrollY;

phoneInput.addEventListener("input", () => {
  phoneInput.value = formatPhone(phoneInput.value);
});

function setHeaderState() {
  header.classList.toggle("scrolled", window.scrollY > 24);
}

function getHeaderOffset() {
  return Math.ceil(header.getBoundingClientRect().height + 18);
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
  timelineDetail.classList.add("switching");
  window.setTimeout(() => {
    timelineDetail.textContent = timeline[index];
    timelineDetail.classList.remove("switching");
  }, 180);
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
      const top = target.getBoundingClientRect().top + window.scrollY - getHeaderOffset();
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
    const top = target.getBoundingClientRect().top + window.scrollY - getHeaderOffset();
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

  setFormState("sending", "Enviando inscrição...");

  try {
    const response = await fetch("/api/indicacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const contentType = response.headers.get("content-type") || "";
    const result = contentType.includes("application/json")
      ? await response.json()
      : { ok: false, error: "O serviço de inscrições retornou uma resposta inválida." };

    if (!response.ok || !result.ok) {
      const details = result.fields ? Object.values(result.fields).join(" ") : result.error;
      throw new Error(details || "Não foi possível enviar a inscrição.");
    }

    setFormState("success", `Inscrição recebida com sucesso. Protocolo: ${result.id}`);
    form.reset();
  } catch (error) {
    const subject = encodeURIComponent(`Inscrição - Prêmio IDEAU 2026 - ${data.nome}`);
    const body = encodeURIComponent(
      [
        `Nome do inscrito ou indicado: ${data.nome}`,
        `Categoria: ${data.categoria}`,
        `Preenchido por: ${data.autor}`,
        `E-mail: ${data.email || ""}`,
        `Telefone: ${data.telefone || ""}`,
        `Instituição: ${data.instituicao || ""}`,
        `Cidade: ${data.cidade || ""}`,
        "",
        "Motivo:",
        data.motivo,
      ].join("\n"),
    );

    const message = error instanceof Error ? error.message : "Não foi possível enviar a inscrição.";
    setFormState(
      "error",
      `${message} <a href="mailto:?subject=${subject}&body=${body}">Enviar por e-mail</a>`,
    );
    console.warn(error);
  }
});

function setFormState(type, message) {
  formStatus.className = `form-status ${type}`;
  formStatus.innerHTML = message;
  submitButton.disabled = type === "sending";
  submitButton.textContent = type === "sending" ? "Enviando..." : "Enviar inscrição";
}

function formatPhone(value) {
  const digits = String(value).replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;

  const ddd = digits.slice(0, 2);
  const number = digits.slice(2);
  if (number.length <= 4) return `(${ddd}) ${number}`;

  const firstPartLength = digits.length > 10 ? 5 : 4;
  return `(${ddd}) ${number.slice(0, firstPartLength)}-${number.slice(firstPartLength)}`;
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

setHeaderState();
moveHeroElements();
updateScrollProgress();
