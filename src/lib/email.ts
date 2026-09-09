/**
 * Envio de mails transaccionales via Resend.
 *
 * No usa el SDK a proposito: la API de Resend es un POST y con fetch alcanza,
 * asi evitamos sumar una dependencia mas al proyecto.
 *
 * Config (.env):
 *   RESEND_API_KEY=re_xxxxx        <- de resend.com/api-keys
 *   EMAIL_FROM="N$ <no-reply@tudominio.com>"
 *
 * Si RESEND_API_KEY no esta seteada, no se cae: escribe el mail en la consola
 * del servidor. Eso permite probar el flujo completo en desarrollo sin tener
 * todavia la cuenta de Resend (el link de verificacion / reset aparece en la
 * terminal donde corre `npm run dev`).
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

interface EnviarMailArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function enviarMail({ to, subject, html, text }: EnviarMailArgs): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "N$ <onboarding@resend.dev>";

  if (!apiKey) {
    console.log("\n──────────────────────────────────────────────");
    console.log("MAIL NO ENVIADO (falta RESEND_API_KEY en .env)");
    console.log("Para:", to);
    console.log("Asunto:", subject);
    console.log(text);
    console.log("──────────────────────────────────────────────\n");
    return;
  }

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    // No propagamos el detalle al cliente: puede tener info de la cuenta.
    console.error("Resend respondio", res.status, detalle);
    throw new Error("No se pudo enviar el mail");
  }
}

/** URL base de la app, para armar los links que van dentro del mail. */
export function baseUrl(): string {
  return (
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

const estiloBase = `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#1a1a1a`;

function plantilla(titulo: string, cuerpo: string, boton: { texto: string; url: string }, pie: string) {
  return `<!doctype html>
<html lang="es"><body style="${estiloBase};background:#f5f5f4;margin:0;padding:32px 16px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px">
    <h1 style="font-size:20px;margin:0 0 16px">${titulo}</h1>
    <div style="font-size:15px;color:#44403c">${cuerpo}</div>
    <a href="${boton.url}" style="display:inline-block;margin:24px 0;padding:12px 24px;background:#1a1a1a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">${boton.texto}</a>
    <p style="font-size:13px;color:#78716c;margin:0">${pie}</p>
    <p style="font-size:12px;color:#a8a29e;margin:16px 0 0;word-break:break-all">Si el boton no funciona, copia y pega este link:<br>${boton.url}</p>
  </div>
</body></html>`;
}

export function mailVerificacion(nombre: string, url: string) {
  return {
    subject: "Confirma tu email — N$ Seguimiento",
    html: plantilla(
      `Hola ${nombre}`,
      "<p>Confirma que este es tu email para activar tu cuenta. Es lo que te va a permitir recuperar el acceso si alguna vez olvidas la contrase&ntilde;a.</p>",
      { texto: "Confirmar mi email", url },
      "El link vence en 24 horas. Si no esperabas este mail, ignoralo."
    ),
    text: `Hola ${nombre},\n\nConfirma tu email entrando a este link:\n${url}\n\nVence en 24 horas.`,
  };
}

export function mailReset(nombre: string, url: string) {
  return {
    subject: "Restablecer tu contraseña — N$ Seguimiento",
    html: plantilla(
      `Hola ${nombre}`,
      "<p>Pediste restablecer tu contrase&ntilde;a. Entr&aacute; al link y eleg&iacute; una nueva.</p>",
      { texto: "Elegir contraseña nueva", url },
      "El link vence en 1 hora y sirve una sola vez. Si no fuiste vos, ignorá este mail: tu contraseña actual sigue funcionando."
    ),
    text: `Hola ${nombre},\n\nPara elegir una contraseña nueva entrá a:\n${url}\n\nVence en 1 hora y sirve una sola vez.\nSi no fuiste vos, ignorá este mail.`,
  };
}
