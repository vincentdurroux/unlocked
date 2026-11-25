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

function detectPlatform(p: any): 'ios' | 'android' | 'web' {
  const modelLower = String(p?.device_model || '').toLowerCase();
  const tagPlatform = String(p?.tags?.platform || '').toLowerCase();
  if (
    p?.device_type === 0 ||
    tagPlatform === 'ios' ||
    modelLower.includes('iphone') ||
    modelLower.includes('ipad') ||
    modelLower.includes('ipod')
  ) {
    return 'ios';
  }
  if (
    p?.device_type === 1 ||
    tagPlatform === 'android' ||
    modelLower.includes('android') ||
    modelLower.includes('linux') ||
    modelLower.includes('pixel') ||
    modelLower.includes('samsung') ||
    modelLower.startsWith('sm-')
  ) {
    return 'android';
  }
  return 'web';
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");

  try {
    const config = getActiveOneSignalConfig();
    if (!config.restApiKey || !config.appId) {
      return res.status(400).json({ error: "OneSignal is not configured yet." });
    }

    const auth = config.restApiKey.startsWith("os_v2_") ? `Bearer ${config.restApiKey}` : `Basic ${config.restApiKey}`;
    const PAGE_SIZE = 300;
    const MAX_PAGES = 10; // Up to 3,000 subscribers
    const allPlayers: any[] = [];
    const seenIds = new Set<string>();
    let totalCount = 0;

    for (let page = 0; page < MAX_PAGES; page++) {
      const offset = page * PAGE_SIZE;
      const response = await fetch(
        `https://onesignal.com/api/v1/players?app_id=${encodeURIComponent(config.appId)}&limit=${PAGE_SIZE}&offset=${offset}`,
        { headers: { "Authorization": auth } }
      );

      if (!response.ok) {
        if (page === 0) {
          return res.status(response.status).json({ error: "Could not fetch devices from OneSignal." });
        }
        break;
      }

      const data = await response.json();
      if (typeof data?.total_count === 'number') {
        totalCount = data.total_count;
      }
      const batch = Array.isArray(data?.players) ? data.players : [];
      for (const p of batch) {
        if (p?.id && !seenIds.has(p.id)) {
          seenIds.add(p.id);
          allPlayers.push(p);
        }
      }

      if (batch.length < PAGE_SIZE) {
        break;
      }
      if (totalCount > 0 && offset + batch.length >= totalCount) {
        break;
      }
    }

    // Keep all non-invalid devices (and flag push-messageable status) sorted by most recently active first
    const devices = allPlayers
      .filter((p: any) => Boolean(p?.id) && !p.invalid_identifier)
      .map((p: any) => {
        const platform = detectPlatform(p);
        const notificationTypes = typeof p.notification_types === 'number' ? p.notification_types : 1;
        const isMessageable = Boolean(p.identifier) && notificationTypes > 0;
        return {
          id: p.id,
          model: p.device_model || (platform === 'ios' ? 'iPhone / iOS' : platform === 'android' ? 'Android' : 'Web Browser'),
          platform,
          os: p.device_os || '',
          sessionCount: p.session_count || 0,
          lastActive: p.last_active || 0,
          createdAt: p.created_at || 0,
          externalUserId: p.external_user_id || null,
          isMessageable,
        };
      })
      .sort((a: any, b: any) => {
        if ((b.lastActive || 0) !== (a.lastActive || 0)) {
          return (b.lastActive || 0) - (a.lastActive || 0);
        }
        return (b.createdAt || 0) - (a.createdAt || 0);
      });

    return res.status(200).json({
      devices,
      totalCount: totalCount || allPlayers.length,
      fetchedCount: allPlayers.length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Error fetching devices from OneSignal." });
  }
}
