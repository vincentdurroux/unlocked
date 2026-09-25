export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { title, message, targetUserIds, url } = body || {};
    const appId =
      process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ||
      process.env.ONESIGNAL_APP_ID ||
      "10a14311-a42a-4681-9682-ce965d80ae75";
    const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (!restApiKey) {
      return new Response(
        JSON.stringify({ 
          error: "ONESIGNAL_REST_API_KEY n'est pas encore configurée sur le serveur. Veuillez l'ajouter dans vos variables d'environnement serveur pour envoyer des notifications push en production." 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
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
      return new Response(
        JSON.stringify({ 
          error: data.errors?.[0] || "Échec de l'envoi de la notification push OneSignal.",
          details: data 
        }),
        { status: oneSignalRes.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ success: true, result: data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error("[api] OneSignal push send error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erreur serveur lors de l'envoi OneSignal." }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
