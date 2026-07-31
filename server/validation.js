const categories = new Set([
  "Prêmio Sempre Professor(a)",
  "Prêmio Inspiração",
  "Prêmio Inovação",
  "Prêmio Inclusão Social",
]);

export function validateIndication(input) {
  const data = input || {};
  const errors = {};

  validateText(errors, data.nome, "nome", "Nome do inscrito ou indicado", 3, 120);
  validateText(errors, data.categoria, "categoria", "Categoria", 3, 80);
  validateText(errors, data.autor, "autor", "Seu nome", 3, 120);
  validateText(errors, data.motivo, "motivo", "Motivo", 40, 1800);

  if (data.categoria && !categories.has(String(data.categoria))) {
    errors.categoria = "Selecione uma categoria válida.";
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email))) {
    errors.email = "Informe um e-mail válido.";
  }

  if (data.telefone && cleanPhone(data.telefone).length < 10) {
    errors.telefone = "Informe um telefone com DDD.";
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
  };
}

export function normalizeIndication(input, meta) {
  const now = new Date().toISOString();
  return {
    id: meta.id,
    created_at: now,
    updated_at: now,
    status: "recebida",
    nome_indicado: cleanText(input.nome),
    categoria: cleanText(input.categoria),
    autor_nome: cleanText(input.autor),
    autor_email: cleanText(input.email || ""),
    autor_telefone: cleanPhone(input.telefone || ""),
    instituicao: cleanText(input.instituicao || ""),
    cidade: cleanText(input.cidade || "Bagé e Região da Campanha"),
    motivo: cleanText(input.motivo),
    ip_hash: meta.ipHash,
    user_agent: cleanText(meta.userAgent || "").slice(0, 300),
  };
}

function validateText(errors, value, key, label, min, max) {
  const text = cleanText(value || "");
  if (text.length < min) {
    errors[key] = `${label} precisa ter pelo menos ${min} caracteres.`;
    return;
  }
  if (text.length > max) {
    errors[key] = `${label} pode ter no máximo ${max} caracteres.`;
  }
}

function cleanText(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function cleanPhone(value) {
  return String(value).replace(/[^\d+]/g, "").trim();
}
