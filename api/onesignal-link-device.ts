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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    const { userId, playerId } = body || {};

    if (!userId || !playerId) {
      return res.status(400).json({ error: "userId and playerId are required." });
    }

    const config = getActiveOneSignalConfig();
    if (!config.restApiKey || !config.appId) {
      return res.status(400).json({ error: "OneSignal is not configured yet." });
    }

    const v2Auth = config.restApiKey.startsWith("os_v2_") ? `Key ${config.restApiKey}` : `Basic ${config.restApiKey}`;
    const v1Auth = config.restApiKey.startsWith("os_v2_") ? `Bearer ${config.restApiKey}` : `Basic ${config.restApiKey}`;

    // 1. Try OneSignal modern User Model (v2) transfer subscription to external_id
    let v2Success = false;
    let v2Error: any = null;
    try {
      const v2Res = await fetch(
        `https://api.onesignal.com/apps/${encodeURIComponent(config.appId)}/subscriptions/${encodeURIComponent(playerId)}/owner`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Authorization": v2Auth
          },
          body: JSON.stringify({
            identity: {
              external_id: userId
            }
          })
        }
      );
      if (v2Res.ok) {
        v2Success = true;
      } else {
        v2Error = await v2Res.json().catch(() => ({ status: v2Res.status }));
      }
    } catch (e: any) {
      v2Error = e?.message || 'v2 transfer error';
    }

    if (v2Success) {
      return res.status(200).json({ success: true, playerId, userId, apiVersion: 'v2' });
    }

    // 2. Fallback to legacy Players API (v1)
    const response = await fetch(`https://onesignal.com/api/v1/players/${encodeURIComponent(playerId)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": v1Auth
      },
      body: JSON.stringify({
        app_id: config.appId,
        external_user_id: userId
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.errors || v2Error?.errors || "Could not link device in OneSignal.",
        v2Error
      });
    }

    return res.status(200).json({ success: true, playerId, userId, apiVersion: 'v1' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Error linking device." });
  }
}
