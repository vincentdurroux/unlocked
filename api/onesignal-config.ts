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

  let keyStatus: "valid" | "is_app_id" | "missing" = "missing";
  let keyMessage = "";

  if (!restApiKey) {
    keyStatus = "missing";
    keyMessage = "Clé API REST OneSignal manquante. Configurez-la dans les options d'administration pour activer les notifications push.";
  } else if (isUUID) {
    keyStatus = "is_app_id";
    keyMessage = "La clé configurée sur le serveur est un App ID (format UUID) et non la clé API REST secrète. Rendez-vous dans OneSignal Dashboard > Settings > Keys & IDs pour copier votre 'REST API Key'.";
  } else if (isValidKey) {
    keyStatus = "valid";
    keyMessage = "Clé API REST OneSignal configurée et active.";
  }

  return {
    appId,
    restApiKey,
    hasServerApiKey: isValidKey,
    keyStatus,
    keyMessage,
    keyPreview: restApiKey ? `${restApiKey.slice(0, 4)}...${restApiKey.slice(-4)}` : null
  };
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
      }
      const { appId, restApiKey } = body || {};
      const current = getActiveOneSignalConfig();

      const newAppId = (appId && typeof appId === 'string' && appId.trim()) ? appId.trim() : current.appId;
      const newRestKey = (restApiKey && typeof restApiKey === 'string') ? restApiKey.trim() : current.restApiKey;

      if (newRestKey) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(newRestKey);
        if (isUUID) {
          return res.status(400).json({
            error: "La valeur fournie est un App ID (UUID) et non la clé API REST secrète. Copiez la 'REST API Key' dans OneSignal Dashboard > Settings > Keys & IDs."
          });
        }
      }

      const toSave = { appId: newAppId, restApiKey: newRestKey };
      try {
        fs.writeFileSync(ONESIGNAL_CONFIG_FILE, JSON.stringify(toSave, null, 2), "utf-8");
      } catch (_) {}

      if (newAppId) {
        process.env.ONESIGNAL_APP_ID = newAppId;
        process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID = newAppId;
      }
      if (newRestKey) {
        process.env.ONESIGNAL_REST_API_KEY = newRestKey;
      }

      return res.status(200).json({
        success: true,
        message: "Configuration OneSignal enregistrée avec succès !",
        config: getActiveOneSignalConfig()
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Erreur de configuration." });
    }
  }

  const config = getActiveOneSignalConfig();
  return res.status(200).json(config);
}
