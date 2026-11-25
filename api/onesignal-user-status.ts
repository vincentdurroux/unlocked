import fs from 'fs';
import path from 'path';

const ONESIGNAL_CONFIG_FILE = path.join(process.cwd(), ".onesignal_server_config.json");
const DEFAULT_APP_ID = "10a14311-a42a-4681-9682-ce965d80ae75";

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
    DEFAULT_APP_ID;

  const appId = customAppId || envAppId;
  const rawEnvKey = (process.env.ONESIGNAL_REST_API_KEY || "").trim();
  const restApiKey = customRestApiKey || rawEnvKey;

  return { appId, restApiKey };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const userId = typeof req.query?.userId === 'string' ? req.query.userId.trim() : '';
    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required.' });
    }

    const config = getActiveOneSignalConfig();
    if (!config.restApiKey || !config.appId) {
      return res.status(400).json({ error: 'OneSignal is not configured on the server.' });
    }

    const v2Auth = config.restApiKey.startsWith("os_v2_") ? `Key ${config.restApiKey}` : `Basic ${config.restApiKey}`;
    const v1Auth = config.restApiKey.startsWith("os_v2_") ? `Bearer ${config.restApiKey}` : `Basic ${config.restApiKey}`;

    // 1. Look up user by external_id via OneSignal v2 User Model API
    let userFound = false;
    let onesignalId: string | null = null;
    let subscriptions: any[] = [];
    let lookupStatus = 0;
    let lookupError: string | null = null;

    try {
      const userRes = await fetch(
        `https://api.onesignal.com/apps/${encodeURIComponent(config.appId)}/users/by/external_id/${encodeURIComponent(userId)}`,
        {
          headers: {
            "Authorization": v2Auth,
            "Accept": "application/json"
          }
        }
      );
      lookupStatus = userRes.status;
      if (userRes.ok) {
        const userData = await userRes.json();
        userFound = true;
        onesignalId = userData?.identity?.onesignal_id || null;
        subscriptions = Array.isArray(userData?.subscriptions)
          ? userData.subscriptions.map((sub: any) => ({
              id: sub.id,
              type: sub.type || 'Unknown',
              enabled: Boolean(sub.enabled),
              notificationTypes: sub.notification_types,
              tokenPresent: Boolean(sub.token),
              tokenPreview: sub.token ? `${String(sub.token).slice(0, 10)}…${String(sub.token).slice(-6)}` : null,
              isPushSubscribed: Boolean(sub.enabled) && Boolean(sub.token) && (sub.notification_types === undefined || Number(sub.notification_types) > 0),
              sdk: sub.sdk || null,
              deviceModel: sub.device_model || null,
              deviceOs: sub.device_os || null,
              appVersion: sub.app_version || null,
              lastActive: sub.last_active || null
            }))
          : [];
      } else if (userRes.status !== 404) {
        const errJson = await userRes.json().catch(() => ({}));
        lookupError = JSON.stringify(errJson?.errors || errJson || `HTTP ${userRes.status}`);
      }
    } catch (e: any) {
      lookupError = e?.message || 'Failed to query OneSignal v2 user endpoint';
    }

    // 2. Also scan recent iOS players (up to 300) to detect anonymous (unlinked) iOS subscriptions
    //    and any iOS players matching external_user_id in legacy view
    let recentAnonymousIOS: any[] = [];
    let recentLinkedIOSFromPlayers: any[] = [];
    let totalIOSDevices = 0;

    try {
      const playersRes = await fetch(
        `https://onesignal.com/api/v1/players?app_id=${encodeURIComponent(config.appId)}&limit=300&offset=0`,
        { headers: { "Authorization": v1Auth } }
      );
      if (playersRes.ok) {
        const playersData = await playersRes.json();
        const players = Array.isArray(playersData?.players) ? playersData.players : [];
        const iosPlayers = players
          .filter((p: any) => p.device_type === 0 && !p.invalid_identifier)
          .sort((a: any, b: any) => (b.last_active || 0) - (a.last_active || 0));

        totalIOSDevices = iosPlayers.length;

        const mapPlayer = (p: any) => ({
          id: p.id,
          externalUserId: p.external_user_id || null,
          tokenPresent: Boolean(p.identifier),
          tokenPreview: p.identifier ? `${String(p.identifier).slice(0, 10)}…${String(p.identifier).slice(-6)}` : null,
          notificationTypes: p.notification_types,
          isPushSubscribed: Boolean(p.identifier) && Number(p.notification_types ?? 1) > 0,
          deviceModel: p.device_model || 'iPhone',
          deviceOs: p.device_os || '',
          sdk: p.sdk || '',
          appVersion: p.game_version || '',
          lastActive: p.last_active || null,
          createdAt: p.created_at || null
        });

        recentAnonymousIOS = iosPlayers
          .filter((p: any) => !p.external_user_id)
          .slice(0, 8)
          .map(mapPlayer);

        recentLinkedIOSFromPlayers = iosPlayers
          .filter((p: any) => p.external_user_id === userId)
          .map(mapPlayer);
      }
    } catch (_) {}

    const hasPushSubscribedIOS =
      subscriptions.some((s) => /ios/i.test(String(s.type)) && s.isPushSubscribed) ||
      recentLinkedIOSFromPlayers.some((p) => p.isPushSubscribed);

    return res.status(200).json({
      appId: config.appId,
      externalId: userId,
      userFound,
      lookupStatus,
      lookupError,
      onesignalId,
      subscriptions,
      hasPushSubscribedIOS,
      totalIOSDevices,
      recentAnonymousIOS,
      recentLinkedIOSFromPlayers
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error checking OneSignal user status.' });
  }
}
