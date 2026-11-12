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

    const {
      title,
      message,
      targetUserIds,
      targetSubscriptionIds,
      targetPlayerIds,
      url,
      appId: requestedAppId,
      imageUrl,
      data: customData,
      channels,
      targetChannels
    } = body || {};
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

    const baseUrl = "https://mycityunlocked.app";
    const rawUrl = url || customData?.url || "/";
    const absoluteUrl = rawUrl.startsWith("http")
      ? rawUrl
      : `${baseUrl}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;

    // Default to mobile native channels ['ios', 'android'] unless 'web' is explicitly requested
    const selectedChannels: string[] = Array.isArray(targetChannels) && targetChannels.length > 0
      ? targetChannels
      : (Array.isArray(channels) && channels.length > 0 ? channels : ['ios', 'android']);

    const enableIos = selectedChannels.includes('ios') || selectedChannels.includes('mobile');
    const enableAndroid = selectedChannels.includes('android') || selectedChannels.includes('mobile');
    const enableWeb = selectedChannels.includes('web');

    const basePayload: any = {
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
      url: absoluteUrl,
      web_url: absoluteUrl,
      priority: 10,
      // Target platforms strictly according to requested channels:
      isIos: enableIos,
      isAndroid: enableAndroid,
      isChromeWeb: enableWeb,
      isChrome: enableWeb,
      isSafariWeb: enableWeb,
      isSafari: enableWeb,
      isFirefox: enableWeb,
      isEdge: enableWeb,
      isAnyWeb: enableWeb,
      isWP_WNS: false,
      isAdm: false,
      ios_sound: "default",
      content_available: true,
      mutable_content: true,
      apns_push_type_override: "alert",
      android_visibility: 1,
      android_accent_color: "2563EB",
      android_sound: "default",
      ios_badgeType: "Increase",
      ios_badgeCount: 1,
      data: {
        url: absoluteUrl,
        launchUrl: absoluteUrl,
        ...(customData || {})
      }
    };

    if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim()) {
      const cleanImg = imageUrl.trim();
      basePayload.ios_attachments = { id1: cleanImg };
      basePayload.big_picture = cleanImg;
      basePayload.chrome_web_image = cleanImg;
    }

    const subs = (targetSubscriptionIds && Array.isArray(targetSubscriptionIds) ? targetSubscriptionIds : [])
      .concat(targetPlayerIds && Array.isArray(targetPlayerIds) ? targetPlayerIds : [])
      .filter(Boolean);

    const hasUserIds = Boolean(targetUserIds && Array.isArray(targetUserIds) && targetUserIds.length > 0);
    const payload: any = { ...basePayload };

    if (hasUserIds) {
      // Prioritize External ID (Supabase User ID) so ALL native mobile subscriptions of the user are targeted
      payload.include_aliases = { external_id: targetUserIds };
      payload.target_channel = "push";
    } else if (subs.length > 0) {
      // Explicit device token targeting (or fallback when no user ID is provided)
      payload.include_subscription_ids = subs;
    } else {
      payload.included_segments = ["Total Subscriptions"];
    }

    const initialAuth = restApiKey.startsWith("os_v2_") ? `Bearer ${restApiKey}` : `Basic ${restApiKey}`;
    const sendToOneSignal = async (bodyPayload: any, auth: string = initialAuth) => {
      return fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": auth
        },
        body: JSON.stringify(bodyPayload)
      });
    };

    let activeAuth = initialAuth;
    let oneSignalRes = await sendToOneSignal(payload, activeAuth);
    let data = await oneSignalRes.json();

    if (oneSignalRes.status === 401) {
      activeAuth = initialAuth.startsWith("Bearer ") ? `Basic ${restApiKey}` : `Bearer ${restApiKey}`;
      oneSignalRes = await sendToOneSignal(payload, activeAuth);
      data = await oneSignalRes.json();
    }

    if (!oneSignalRes.ok && payload.included_segments && JSON.stringify(data).includes("Total Subscriptions")) {
      payload.included_segments = ["Subscribed Users"];
      oneSignalRes = await sendToOneSignal(payload, activeAuth);
      data = await oneSignalRes.json();
    }

    // Fallback: if External ID targeting yielded 0 recipients (e.g. device not yet linked via OneSignal.login)
    // and we also have a stored Subscription ID, retry with include_subscription_ids
    const initialRecipients = data?.recipients ?? (data?.id ? 1 : 0);
    if (hasUserIds && subs.length > 0 && (!oneSignalRes.ok || initialRecipients === 0 || !data?.id)) {
      const fallbackPayload: any = {
        ...basePayload,
        include_subscription_ids: subs
      };
      const fbRes = await sendToOneSignal(fallbackPayload, activeAuth);
      const fbData = await fbRes.json();
      if (fbRes.ok && (fbData?.id || (fbData?.recipients ?? 0) > 0)) {
        oneSignalRes = fbRes;
        data = fbData;
      }
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
      warning = "La notification a été acceptée par OneSignal mais aucun appareil Mobile (iOS/Android) actif n'était ciblé (0 destinataire). Vérifiez que l'application mobile iOS/Android est bien abonnée à OneSignal.";
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
