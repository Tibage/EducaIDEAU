// Rota explícita para garantir que a função administrativa seja descoberta
// corretamente pela Vercel, sem depender apenas da rota catch-all.
import app from "../../server/index.js";

export default app;
