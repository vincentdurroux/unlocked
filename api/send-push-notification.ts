export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { title, message, targetUserIds, url } = body || {};
    const appId =
      process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ||
      process.env.ONESIGNAL_APP_ID ||
      "10a14311-a42a-4681-9682-ce965d80ae75";
    const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (!restApiKey) {
      return res.status(400).json({ 
        error: "ONESIGNAL_REST_API_KEY n'est pas encore configurée sur le serveur. Veuillez l'ajouter dans vos variables d'environnement serveur pour envoyer des notifications push en production." 
      });
    }

    const payload: any = {
      app_id: appId,
      headings: { en: title || "Unlocked Valencia" },
      contents: { en: message || "You have a new update!" },
      url: url || "/"
    };

    if (targetUserIds && Array.isArray(targetUserIds) && targetUserIds.length > 0) {
      payload.include_aliases = { external_id: targetUserIds };
      payload.target_channel = "push";
    } else {
      payload.included_segments = ["Subscribed Users"];
    }

    const oneSignalRes = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${restApiKey}`
      },
      body: JSON.stringify(payload)
    });

    const data = await oneSignalRes.json();
    if (!oneSignalRes.ok) {
      return res.status(oneSignalRes.status).json({ 
        error: data.errors?.[0] || "Échec de l'envoi de la notification push OneSignal.",
        details: data 
      });
    }

    return res.status(200).json({ success: true, result: data });
  } catch (err: any) {
    console.error("[api] OneSignal push send error:", err);
    return res.status(500).json({ error: err.message || "Erreur serveur lors de l'envoi OneSignal." });
  }
}
