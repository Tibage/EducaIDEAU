// Adaptador para a Vercel: publica todas as rotas /api/* do Express como
// uma única função serverless, sem iniciar um servidor HTTP próprio.
import app from "../server/index.js";

export default app;
