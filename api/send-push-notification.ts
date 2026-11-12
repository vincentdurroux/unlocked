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

    const selectedChannels: string[] = Array.isArray(targetChannels) && targetChannels.length > 0
      ? targetChannels
      : (Array.isArray(channels) && channels.length > 0 ? channels : ['ios', 'android', 'web']);

    const enableIos = selectedChannels.includes('ios') || selectedChannels.includes('mobile');
    const enableAndroid = selectedChannels.includes('android') || selectedChannels.includes('mobile');
    // Crucial: Android PWA/TWA/Chrome and iPhone Safari PWA rely on Web Push in OneSignal
    const enableWeb = selectedChannels.includes('web') || enableIos || enableAndroid;

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
      priority: 10,
      // Target platforms: iOS native app, iOS Web Push / PWA, Android, and Web
      isIos: enableIos,
      isAndroid: enableAndroid,
      isChromeWeb: enableWeb,
      isSafariWeb: enableWeb,
      isFirefox: enableWeb,
      isEdge: enableWeb,
      isAnyWeb: enableWeb,
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

    // Support comma-separated list of multiple device subscription IDs per user
    const rawSubs = (targetSubscriptionIds && Array.isArray(targetSubscriptionIds) ? targetSubscriptionIds : [])
      .concat(targetPlayerIds && Array.isArray(targetPlayerIds) ? targetPlayerIds : []);
    const subs = Array.from(
      new Set(
        rawSubs
          .flatMap((item: any) => String(item || '').split(','))
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0 && !s.startsWith('local-'))
      )
    );

    const hasUserIds = Boolean(targetUserIds && Array.isArray(targetUserIds) && targetUserIds.length > 0);
    const payload: any = { ...basePayload };

    if (subs.length > 0) {
      payload.include_subscription_ids = subs;
    } else if (hasUserIds) {
      payload.include_aliases = { external_id: targetUserIds };
      payload.target_channel = "push";
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

    // Fallback if Total Subscriptions segment name differs
    if (!oneSignalRes.ok && payload.included_segments && JSON.stringify(data).includes("Total Subscriptions")) {
      payload.included_segments = ["Subscribed Users"];
      oneSignalRes = await sendToOneSignal(payload, activeAuth);
      data = await oneSignalRes.json();
    }

    // Fallback if include_subscription_ids failed -> try include_player_ids
    if (!oneSignalRes.ok && subs.length > 0 && payload.include_subscription_ids) {
      const playerPayload: any = { ...basePayload, include_player_ids: subs };
      oneSignalRes = await sendToOneSignal(playerPayload, activeAuth);
      data = await oneSignalRes.json();
    }

    // If targeting a specific user and we also have targetUserIds, ensure External ID is also targeted if subs failed or had 0 recipients
    if (hasUserIds && subs.length > 0 && (!oneSignalRes.ok || !data?.id || data?.recipients === 0)) {
      const aliasPayload: any = {
        ...basePayload,
        include_aliases: { external_id: targetUserIds },
        target_channel: "push"
      };
      const aliasRes = await sendToOneSignal(aliasPayload, activeAuth);
      const aliasData = await aliasRes.json();
      if (aliasRes.ok && aliasData?.id) {
        oneSignalRes = aliasRes;
        data = aliasData;
      }
    }

    // Fallback if External ID has no linked player in OneSignal yet -> broadcast to Subscribed Users / Total Subscriptions so notification is never lost
    if (hasUserIds && (!oneSignalRes.ok || !data?.id || (Array.isArray(data?.errors) && data.errors.length > 0))) {
      const segPayload: any = {
        ...basePayload,
        included_segments: ["Total Subscriptions"]
      };
      let segRes = await sendToOneSignal(segPayload, activeAuth);
      let segData = await segRes.json();
      if (!segRes.ok && JSON.stringify(segData).includes("Total Subscriptions")) {
        segPayload.included_segments = ["Subscribed Users"];
        segRes = await sendToOneSignal(segPayload, activeAuth);
        segData = await segRes.json();
      }
      if (segRes.ok && segData?.id) {
        oneSignalRes = segRes;
        data = segData;
      }
    }

    if (!oneSignalRes.ok) {
      const errDetail = Array.isArray(data?.errors) ? data.errors.join(', ') : ( JSON.stringify(data?.errors || data) );
      return res.status(oneSignalRes.status).json({ 
        error: errDetail || "Échec de l'envoi de la notification push OneSignal.",
        details: data 
      });
    }

    const recipientCount = data.recipients ?? (data.id ? 1 : 0);
    let warning: string | undefined = undefined;
    if (recipientCount === 0) {
      warning = "La notification a été acceptée par OneSignal mais aucun appareil actif n'était ciblé (0 destinataire). Vérifiez que votre téléphone est bien abonné aux notifications.";
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
