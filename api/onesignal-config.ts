export default function handler(req: any, res: any) {
  const appId =
    process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ||
    process.env.ONESIGNAL_APP_ID ||
    "10a14311-a42a-4681-9682-ce965d80ae75";

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    appId,
    hasServerApiKey: Boolean(process.env.ONESIGNAL_REST_API_KEY)
  });
}
