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

    const titleStr = title || "MyCityUnlocked";
    const messageStr = message || "New notification from MyCityUnlocked";

    const baseUrl = "https://mycityunlocked.app";
    const rawUrl = url || customData?.url || "/";
    const absoluteUrl = rawUrl.startsWith("http")
      ? rawUrl
      : `${baseUrl}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;
    const brandLogoUrl = `${baseUrl}/logo2.png`;

    const buildIosAppUrl = (inputUrl: string, extraData: any): string => {
      const safeRaw = String(inputUrl || '/').trim();
      const d = extraData && typeof extraData === 'object' ? extraData : {};
      const notifType = String(d.type || '').toLowerCase();
      const notifTheme = String(d.theme || '').toLowerCase();
      const notifFocus = String(d.focus || '').toLowerCase();

      const urlEventMatch = safeRaw.match(/[?&]eventId=([^&#]+)/i) || safeRaw.match(/\/events?\/([^/?#]+)/i);
      const urlGuideMatch = safeRaw.match(/[?&](?:guideId|articleId)=([^&#]+)/i) || safeRaw.match(/\/(?:guides?|articles?)\/([^/?#]+)/i);
      const urlProMatch = safeRaw.match(/[?&]proId=([^&#]+)/i) || safeRaw.match(/\/(?:pros?|explore)\/([^/?#]+)/i);

      const eventId =
        d.eventId ||
        (urlEventMatch?.[1] ? decodeURIComponent(urlEventMatch[1]) : '') ||
        (d.target_id && (notifType === 'event' || notifTheme.startsWith('event')) ? String(d.target_id) : '');
      const guideId =
        d.guideId ||
        d.articleId ||
        (urlGuideMatch?.[1] ? decodeURIComponent(urlGuideMatch[1]) : '') ||
        (d.target_id && (notifType === 'guide' || notifType === 'article' || notifTheme.startsWith('guide') || notifTheme.startsWith('article')) ? String(d.target_id) : '');
      const proId =
        d.proId ||
        (urlProMatch?.[1] ? decodeURIComponent(urlProMatch[1]) : '') ||
        (d.target_id && (notifType === 'pro' || notifTheme.startsWith('pro')) ? String(d.target_id) : '');

      if (eventId) return `mycityunlocked://open?eventId=${encodeURIComponent(String(eventId))}`;
      if (guideId) return `mycityunlocked://open?guideId=${encodeURIComponent(String(guideId))}`;
      if (proId) return `mycityunlocked://open?proId=${encodeURIComponent(String(proId))}`;

      if (
        notifFocus === 'weekend-events' ||
        notifType === 'weekend' ||
        notifTheme === 'weekend' ||
        notifTheme === 'weekend_digest' ||
        /focus=weekend/i.test(safeRaw) ||
        /weekend-events/i.test(safeRaw)
      ) {
        return 'mycityunlocked://open?focus=weekend-events';
      }

      if (notifType === 'event' || /#events\b/i.test(safeRaw) || /^\/?events\b/i.test(safeRaw)) {
        return 'mycityunlocked://open?view=events';
      }
      if (notifType === 'guide' || notifType === 'article' || /#guides\b/i.test(safeRaw) || /^\/?(?:guides|articles)\b/i.test(safeRaw)) {
        return 'mycityunlocked://open?view=guides';
      }
      if (notifType === 'pro' || /#(?:explore|directory)\b/i.test(safeRaw) || /^\/?(?:explore|directory)\b/i.test(safeRaw)) {
        return 'mycityunlocked://open?view=explore';
      }
      if (notifType === 'chat' || notifType === 'message' || /#messages\b/i.test(safeRaw)) {
        return 'mycityunlocked://open?view=messages';
      }
      if (notifType === 'marketplace' || /#marketplace\b/i.test(safeRaw)) {
        return 'mycityunlocked://open?view=marketplace';
      }

      try {
        const parsed = safeRaw.startsWith('http')
          ? new URL(safeRaw)
          : new URL(`${baseUrl}${safeRaw.startsWith('/') ? '' : '/'}${safeRaw}`);
        if (parsed.search || parsed.hash) {
          return `mycityunlocked://open${parsed.search}${parsed.hash}`;
        }
      } catch (_) {}

      return 'mycityunlocked://open';
    };

    const iosAppUrl = buildIosAppUrl(rawUrl, customData);

    const selectedChannels: string[] = Array.isArray(targetChannels) && targetChannels.length > 0
      ? targetChannels
      : (Array.isArray(channels) && channels.length > 0 ? channels : ['ios', 'android', 'web']);

    const enableIos = selectedChannels.includes('ios') || selectedChannels.includes('mobile');
    const enableAndroid = selectedChannels.includes('android') || selectedChannels.includes('mobile');
    // Crucial: Android PWA/TWA/Chrome and iPhone Safari PWA rely on Web Push in OneSignal
    const enableWeb = selectedChannels.includes('web') || enableIos || enableAndroid;

    const cleanImg = (imageUrl && typeof imageUrl === 'string' && imageUrl.trim()) ? imageUrl.trim() : '';

    const commonPayload: any = {
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
      priority: 10,
      data: {
        ...(customData || {}),
        url: absoluteUrl,
        launchUrl: absoluteUrl,
        appUrl: iosAppUrl
      }
    };

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
    const isSpecificMember = subs.length > 0 || hasUserIds;

    const sendToOneSignal = async (bodyPayload: any, auth: string) => {
      return fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": auth
        },
        body: JSON.stringify(bodyPayload)
      });
    };

    let activeAuth = restApiKey.startsWith("os_v2_") ? `Bearer ${restApiKey}` : `Basic ${restApiKey}`;

    const dispatchPass = async (platformBase: any) => {
      const passPayload: any = { ...platformBase };
      if (subs.length > 0) {
        passPayload.include_player_ids = subs;
        passPayload.include_subscription_ids = subs;
      } else if (hasUserIds) {
        passPayload.include_aliases = { external_id: targetUserIds };
        passPayload.include_external_user_ids = targetUserIds;
        passPayload.target_channel = "push";
      } else {
        passPayload.included_segments = ["Total Subscriptions", "Active Subscriptions"];
      }

      let res = await sendToOneSignal(passPayload, activeAuth);
      let resData = await res.json();

      if (res.status === 401) {
        activeAuth = activeAuth.startsWith("Bearer ") ? `Basic ${restApiKey}` : `Bearer ${restApiKey}`;
        res = await sendToOneSignal(passPayload, activeAuth);
        resData = await res.json();
      }

      if (!isSpecificMember && !res.ok && passPayload.included_segments && JSON.stringify(resData).includes("Total Subscriptions")) {
        passPayload.included_segments = ["Subscribed Users"];
        res = await sendToOneSignal(passPayload, activeAuth);
        resData = await res.json();
      }

      if (isSpecificMember && subs.length > 0 && (!res.ok || !resData?.id || (resData?.recipients || 0) === 0)) {
        if (hasUserIds) {
          const aliasPayload: any = {
            ...platformBase,
            include_aliases: { external_id: targetUserIds },
            include_external_user_ids: targetUserIds,
            target_channel: "push"
          };
          const aliasRes = await sendToOneSignal(aliasPayload, activeAuth);
          const aliasData = await aliasRes.json();
          if (aliasRes.ok && aliasData?.id && (aliasData?.recipients || 0) > 0) {
            res = aliasRes;
            resData = aliasData;
          }
        }
      }

      return { ok: res.ok, status: res.status, data: resData };
    };

    const passPayloads: any[] = [];

    if (enableIos) {
      passPayloads.push({
        ...commonPayload,
        // Native iOS APNs receives custom URL scheme so tapping notification opens the iOS app directly
        app_url: iosAppUrl,
        isIos: true,
        isAndroid: false,
        isChromeWeb: false,
        isSafariWeb: false,
        isFirefox: false,
        isEdge: false,
        isAnyWeb: false,
        ios_sound: "default",
        content_available: true,
        mutable_content: true,
        ios_badgeType: "Increase",
        ios_badgeCount: 1,
        ...(cleanImg ? { ios_attachments: { id1: cleanImg } } : {})
      });
    }

    if (enableAndroid || enableWeb) {
      passPayloads.push({
        ...commonPayload,
        ...(enableWeb ? { web_url: absoluteUrl } : {}),
        ...(enableAndroid ? { app_url: absoluteUrl } : {}),
        chrome_web_icon: brandLogoUrl,
        chrome_web_badge: brandLogoUrl,
        large_icon: brandLogoUrl,
        isIos: false,
        isAndroid: enableAndroid,
        isChromeWeb: enableWeb,
        isSafariWeb: enableWeb,
        isFirefox: enableWeb,
        isEdge: enableWeb,
        isAnyWeb: enableWeb,
        android_visibility: 1,
        android_accent_color: "2563EB",
        android_sound: "default",
        ...(cleanImg ? { big_picture: cleanImg, chrome_web_image: cleanImg } : {})
      });
    }

    const passResults = await Promise.all(passPayloads.map((p) => dispatchPass(p)));
    const okResults = passResults.filter((r) => r.ok);

    if (okResults.length === 0) {
      const firstFail = passResults[0];
      const errDetail = Array.isArray(firstFail?.data?.errors)
        ? firstFail.data.errors.join(', ')
        : JSON.stringify(firstFail?.data?.errors || firstFail?.data);
      return res.status(firstFail?.status || 400).json({
        error: errDetail || "Échec de l'envoi de la notification push OneSignal.",
        details: firstFail?.data
      });
    }

    const primaryData = okResults.find((r) => r.data?.id && (r.data?.recipients || 0) > 0)?.data || okResults[0].data;
    const recipientCount = okResults.reduce((sum, r) => sum + (typeof r.data?.recipients === 'number' ? r.data.recipients : (r.data?.id ? 1 : 0)), 0);

    let warning: string | undefined = undefined;
    if (recipientCount === 0) {
      warning = "La notification a été acceptée par OneSignal mais aucun appareil actif n'était ciblé (0 destinataire). Vérifiez que votre téléphone est bien abonné aux notifications.";
    }

    return res.status(200).json({
      success: true,
      result: primaryData,
      recipients: recipientCount,
      id: primaryData?.id,
      warning
    });
  } catch (err: any) {
    console.error("[api] OneSignal push send error:", err);
    return res.status(500).json({ error: err.message || "Erreur serveur lors de l'envoi OneSignal." });
  }
}
