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
  res.setHeader("Cache-Control", "no-store");

  try {
    const config = getActiveOneSignalConfig();
    if (!config.restApiKey || !config.appId) {
      return res.status(400).json({ error: "OneSignal is not configured yet." });
    }

    const auth = config.restApiKey.startsWith("os_v2_") ? `Bearer ${config.restApiKey}` : `Basic ${config.restApiKey}`;
    const response = await fetch(`https://onesignal.com/api/v1/players?app_id=${config.appId}&limit=50`, {
      headers: { "Authorization": auth }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Could not fetch devices from OneSignal." });
    }

    const data = await response.json();
    const rawPlayers = Array.isArray(data?.players) ? data.players : [];

    // Filter for messageable active devices (valid push token & not unregistered)
    const activeDevices = rawPlayers
      .filter((p: any) => !p.invalid_identifier && (p.identifier || p.device_type === 0))
      .map((p: any) => {
        let platform = 'web';
        if (p.device_type === 0 || (p.device_model && p.device_model.toLowerCase().includes('iphone'))) {
          platform = 'ios';
        } else if (p.device_type === 5 && p.tags?.platform === 'android') {
          platform = 'android';
        } else if (p.device_model && p.device_model.toLowerCase().includes('linux')) {
          platform = 'android';
        }
        return {
          id: p.id,
          model: p.device_model || (platform === 'ios' ? 'iPhone / iOS' : platform === 'android' ? 'Android' : 'Web Browser'),
          platform,
          os: p.device_os || '',
          sessionCount: p.session_count || 0,
          lastActive: p.last_active || 0,
          externalUserId: p.external_user_id || null
        };
      });

    return res.status(200).json({ devices: activeDevices });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Error fetching devices from OneSignal." });
  }
}
