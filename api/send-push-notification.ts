import fs from 'fs';
import path from 'path';

const ONESIGNAL_CONFIG_FILE = path.join(process.cwd(), ".onesignal_server_config.json");

function getActiveOneSignalConfig() {
  let customAppId = "";
  let customRestApiKey = "";

  try {
    if (fs.existsSync(ONESIGNAL_CONFIG_FILE)) {
      const fileData = JSON.parse(fs.readFileSync(ONESIGNAL_CONFIG_FILE, "utf-8"));
      if (fileData.appId) customAppId = fileData.appId.trim();
      if (fileData.restApiKey) customRestApiKey = fileData.restApiKey.trim();
    }
  } catch (_) {}

  const envAppId =
    process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ||
    process.env.ONESIGNAL_APP_ID ||
    "10a14311-a42a-4681-9682-ce965d80ae75";

  const appId = customAppId || envAppId;
  const rawEnvKey = (process.env.ONESIGNAL_REST_API_KEY || "").trim();
  const restApiKey = customRestApiKey || rawEnvKey;

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(restApiKey);
  const isValidKey = Boolean(restApiKey && restApiKey.length >= 20 && !isUUID);

  return {
    appId,
    restApiKey,
    hasServerApiKey: isValidKey,
    isAppIdError: isUUID
  };
}

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

    const { title, message, targetUserIds, targetSubscriptionIds, targetPlayerIds, url, appId: requestedAppId } = body || {};
    const config = getActiveOneSignalConfig();
    const appId = requestedAppId || config.appId;
    const restApiKey = config.restApiKey;

    if (!restApiKey) {
      return res.status(400).json({ 
        error: "ONESIGNAL_REST_API_KEY n'est pas encore configurée sur le serveur. Veuillez l'ajouter dans vos paramètres d'administration pour envoyer des notifications push." 
      });
    }

    if (config.isAppIdError) {
      return res.status(400).json({
        error: "La clé ONESIGNAL_REST_API_KEY renseignée est un App ID (format UUID), et non la clé API REST secrète de OneSignal. Copiez la 'REST API Key' depuis OneSignal Dashboard > Settings > Keys & IDs."
      });
    }

    const titleStr = title || "Unlocked Valencia 🌴";
    const messageStr = message || "Nouvelle notification Unlocked";

    const payload: any = {
      app_id: appId,
      headings: {
        en: titleStr,
        fr: titleStr,
        es: titleStr
      },
      contents: {
        en: messageStr,
        fr: messageStr,
        es: messageStr
      },
      url: url || "/",
      priority: 10,
      // Target ALL platforms: iOS native app, iOS Web Push / PWA, Android, and Web
      isIos: true,
      isAndroid: true,
      isChromeWeb: true,
      isSafariWeb: true,
      isFirefox: true,
      isEdge: true,
      isAnyWeb: true,
      android_visibility: 1,
      android_accent_color: "2563EB",
      ios_badgeType: "Increase",
      ios_badgeCount: 1
    };

    const subs = (targetSubscriptionIds && Array.isArray(targetSubscriptionIds) ? targetSubscriptionIds : [])
      .concat(targetPlayerIds && Array.isArray(targetPlayerIds) ? targetPlayerIds : [])
      .filter(Boolean);

    if (subs.length > 0) {
      payload.include_player_ids = subs;
      payload.include_subscription_ids = subs;
    } else if (targetUserIds && Array.isArray(targetUserIds) && targetUserIds.length > 0) {
      payload.include_external_user_ids = targetUserIds;
      payload.include_aliases = { external_id: targetUserIds };
      payload.target_channel = "push";
    } else {
      payload.included_segments = ["Total Subscriptions"];
    }

    const sendToOneSignal = async (bodyPayload: any, authPrefix: string = "Basic") => {
      return fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `${authPrefix} ${restApiKey}`
        },
        body: JSON.stringify(bodyPayload)
      });
    };

    let oneSignalRes = await sendToOneSignal(payload, "Basic");
    let data = await oneSignalRes.json();

    if (!oneSignalRes.ok && payload.included_segments && JSON.stringify(data).includes("Total Subscriptions")) {
      payload.included_segments = ["Subscribed Users"];
      oneSignalRes = await sendToOneSignal(payload, "Basic");
      data = await oneSignalRes.json();
    }

    if (oneSignalRes.status === 401 && restApiKey.startsWith("os_v2_")) {
      oneSignalRes = await sendToOneSignal(payload, "Bearer");
      data = await oneSignalRes.json();
    }

    if (!oneSignalRes.ok) {
      return res.status(oneSignalRes.status).json({ 
        error: data.errors?.[0] || "Échec de l'envoi de la notification push OneSignal.",
        details: data 
      });
    }

    const recipientCount = data.recipients ?? (data.id ? 1 : 0);
    let warning: string | undefined = undefined;
    if (recipientCount === 0) {
      warning = "La notification a été acceptée par OneSignal mais aucun appareil actif n'était ciblé (0 destinataire). Vérifiez que votre iPhone est bien abonné à cet App ID ou effectuez un test avec 'Tous les abonnés'.";
    }

    return res.status(200).json({
      success: true,
      result: data,
      recipients: recipientCount,
      id: data.id,
      warning
    });
  } catch (err: any) {
    console.error("[api] OneSignal push send error:", err);
    return res.status(500).json({ error: err.message || "Erreur serveur lors de l'envoi OneSignal." });
  }
}
