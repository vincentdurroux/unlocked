import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

const RP_NAME = 'MyCityUnlocked';
const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getSupabaseAdmin() {
  const supabaseUrl = (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ''
  ).trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function isAllowedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === 'mycityunlocked.app' ||
    h === 'www.mycityunlocked.app' ||
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h.endsWith('.vercel.app') ||
    h.endsWith('.run.app')
  );
}

function resolveRpContext(req: any): { rpID: string; expectedOrigins: string[]; origin: string } | null {
  const rawOrigin = String(req.headers?.origin || '').trim();
  const forwardedProto = String(req.headers?.['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const rawHost = String(req.headers?.['x-forwarded-host'] || req.headers?.host || '').split(',')[0].trim();

  let parsed: URL | null = null;
  if (rawOrigin) {
    try {
      parsed = new URL(rawOrigin);
    } catch {
      return null;
    }
  } else if (rawHost) {
    try {
      const proto = rawHost.startsWith('localhost') || rawHost.startsWith('127.0.0.1') ? 'http' : forwardedProto;
      parsed = new URL(`${proto}://${rawHost}`);
    } catch {
      return null;
    }
  }

  if (!parsed || !isAllowedHost(parsed.hostname)) {
    return null;
  }

  const hostLower = parsed.hostname.toLowerCase();
  if (hostLower === 'mycityunlocked.app' || hostLower === 'www.mycityunlocked.app') {
    return {
      rpID: 'mycityunlocked.app',
      expectedOrigins: ['https://mycityunlocked.app', 'https://www.mycityunlocked.app'],
      origin: parsed.origin,
    };
  }

  return {
    rpID: hostLower,
    expectedOrigins: [parsed.origin],
    origin: parsed.origin,
  };
}

function extractBearerToken(req: any): string | null {
  const authHeader = String(req.headers?.authorization || req.headers?.Authorization || '').trim();
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token.length > 10 ? token : null;
}

function parseBody(req: any): Record<string, any> {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return typeof req.body === 'object' ? req.body : {};
}

function isMissingTableError(err: any): boolean {
  const msg = String(err?.message || err || '').toLowerCase();
  return (
    err?.code === '42P01' ||
    err?.code === 'PGRST205' ||
    msg.includes('user_passkeys') ||
    msg.includes('passkey_challenges')
  ) && (msg.includes('does not exist') || msg.includes('could not find the table') || msg.includes('schema cache'));
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    const rpCtx = resolveRpContext(req);
    if (rpCtx) {
      res.setHeader('Access-Control-Allow-Origin', rpCtx.origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rpCtx = resolveRpContext(req);
  if (!rpCtx) {
    return res.status(403).json({ error: 'Origin not allowed for biometric authentication.' });
  }

  res.setHeader('Access-Control-Allow-Origin', rpCtx.origin);
  res.setHeader('Vary', 'Origin');

  const body = parseBody(req);
  const action = typeof body.action === 'string' ? body.action.trim() : '';

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    if (action === 'status') {
      return res.status(200).json({ configured: false, enabled: false, count: 0 });
    }
    return res.status(503).json({
      error: 'Biometric sign-in is not configured on the server yet (missing SUPABASE_SERVICE_ROLE_KEY).',
      code: 'PASSKEY_NOT_CONFIGURED',
    });
  }

  try {
    // ------------------------------------------------------------------
    // AUTHENTICATED ACTIONS (require verified Supabase Bearer JWT)
    // ------------------------------------------------------------------
    if (
      action === 'status' ||
      action === 'register-options' ||
      action === 'register-verify' ||
      action === 'delete'
    ) {
      const token = extractBearerToken(req);
      if (!token) {
        return res.status(401).json({ error: 'Authentication required.' });
      }

      const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
      if (userErr || !userData?.user) {
        return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
      }
      const user = userData.user;

      if (action === 'status') {
        const { data: rows, error } = await supabaseAdmin
          .from('user_passkeys')
          .select('credential_id, device_name, created_at, last_used_at')
          .eq('user_id', user.id);

        if (error) {
          if (isMissingTableError(error)) {
            return res.status(200).json({ configured: false, enabled: false, count: 0, code: 'PASSKEY_TABLE_MISSING' });
          }
          throw error;
        }

        const list = rows || [];
        return res.status(200).json({
          configured: true,
          enabled: list.length > 0,
          count: list.length,
          passkeys: list,
        });
      }

      if (action === 'delete') {
        const credentialId = typeof body.credentialId === 'string' ? body.credentialId.trim() : '';
        let query = supabaseAdmin.from('user_passkeys').delete().eq('user_id', user.id);
        if (credentialId) {
          query = query.eq('credential_id', credentialId);
        }
        const { error } = await query;
        if (error && !isMissingTableError(error)) throw error;
        return res.status(200).json({ success: true });
      }

      if (action === 'register-options') {
        const { data: existingRows, error: listErr } = await supabaseAdmin
          .from('user_passkeys')
          .select('credential_id, transports')
          .eq('user_id', user.id);

        if (listErr) {
          if (isMissingTableError(listErr)) {
            return res.status(503).json({
              error: 'Passkey database table is not set up in Supabase yet.',
              code: 'PASSKEY_TABLE_MISSING',
            });
          }
          throw listErr;
        }

        const excludeCredentials = (existingRows || []).map((row: any) => ({
          id: String(row.credential_id),
          transports: Array.isArray(row.transports) ? row.transports : undefined,
        }));

        const displayName =
          String(user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'Member').slice(0, 80);

        const options = await generateRegistrationOptions({
          rpName: RP_NAME,
          rpID: rpCtx.rpID,
          userName: user.email || user.id,
          userDisplayName: displayName,
          userID: new TextEncoder().encode(user.id),
          attestationType: 'none',
          excludeCredentials,
          authenticatorSelection: {
            residentKey: 'required',
            userVerification: 'required',
            authenticatorAttachment: 'platform',
          },
        });

        const challengeId = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();

        const { error: chErr } = await supabaseAdmin.from('passkey_challenges').insert({
          id: challengeId,
          user_id: user.id,
          challenge: options.challenge,
          type: 'registration',
          expires_at: expiresAt,
        });

        if (chErr) {
          if (isMissingTableError(chErr)) {
            return res.status(503).json({
              error: 'Passkey database table is not set up in Supabase yet.',
              code: 'PASSKEY_TABLE_MISSING',
            });
          }
          throw chErr;
        }

        return res.status(200).json({ options, challengeId });
      }

      if (action === 'register-verify') {
        const challengeId = typeof body.challengeId === 'string' ? body.challengeId.trim() : '';
        const credential = body.credential;
        const deviceName =
          typeof body.deviceName === 'string' ? body.deviceName.trim().slice(0, 80) : 'This device';

        if (!challengeId || !credential || typeof credential !== 'object') {
          return res.status(400).json({ error: 'Missing registration credential or challenge.' });
        }

        // Atomic single-use consume (DELETE ... RETURNING prevents concurrent replay races)
        const { data: challengeRow, error: chReadErr } = await supabaseAdmin
          .from('passkey_challenges')
          .delete()
          .eq('id', challengeId)
          .eq('user_id', user.id)
          .eq('type', 'registration')
          .select('id, challenge, expires_at')
          .maybeSingle();

        if (chReadErr || !challengeRow) {
          return res.status(400).json({ error: 'Biometric setup session expired. Please try again.' });
        }
        if (new Date(challengeRow.expires_at).getTime() < Date.now()) {
          return res.status(400).json({ error: 'Biometric setup timed out. Please try again.' });
        }

        const verification = await verifyRegistrationResponse({
          response: credential,
          expectedChallenge: challengeRow.challenge,
          expectedOrigin: rpCtx.expectedOrigins,
          expectedRPID: rpCtx.rpID,
          requireUserVerification: true,
        });

        if (!verification.verified || !verification.registrationInfo) {
          return res.status(400).json({ error: 'Biometric verification failed. Please try again.' });
        }

        const { credential: verifiedCred } = verification.registrationInfo;
        const publicKeyB64 = Buffer.from(verifiedCred.publicKey).toString('base64url');
        const transports = Array.isArray(verifiedCred.transports) ? verifiedCred.transports : [];

        const { error: insertErr } = await supabaseAdmin.from('user_passkeys').upsert(
          {
            user_id: user.id,
            credential_id: verifiedCred.id,
            public_key: publicKeyB64,
            counter: Number(verifiedCred.counter || 0),
            transports,
            device_name: deviceName,
            last_used_at: new Date().toISOString(),
          },
          { onConflict: 'credential_id' }
        );

        if (insertErr) throw insertErr;

        return res.status(200).json({
          verified: true,
          credentialId: verifiedCred.id,
        });
      }
    }

    // ------------------------------------------------------------------
    // PUBLIC SIGN-IN ACTIONS (cryptographic WebAuthn verification)
    // ------------------------------------------------------------------
    if (action === 'auth-options') {
      const options = await generateAuthenticationOptions({
        rpID: rpCtx.rpID,
        userVerification: 'required',
      });

      const challengeId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();

      // Best-effort cleanup of expired challenges
      await supabaseAdmin
        .from('passkey_challenges')
        .delete()
        .lt('expires_at', new Date().toISOString());

      const { error: chErr } = await supabaseAdmin.from('passkey_challenges').insert({
        id: challengeId,
        user_id: null,
        challenge: options.challenge,
        type: 'authentication',
        expires_at: expiresAt,
      });

      if (chErr) {
        if (isMissingTableError(chErr)) {
          return res.status(503).json({
            error: 'Biometric sign-in is not set up in Supabase yet.',
            code: 'PASSKEY_TABLE_MISSING',
          });
        }
        throw chErr;
      }

      return res.status(200).json({ options, challengeId });
    }

    if (action === 'auth-verify') {
      const challengeId = typeof body.challengeId === 'string' ? body.challengeId.trim() : '';
      const credential = body.credential;
      const credentialId = typeof credential?.id === 'string' ? credential.id.trim() : '';

      if (!challengeId || !credentialId) {
        return res.status(400).json({ error: 'Missing biometric authentication payload.' });
      }

      // Atomic single-use consume (DELETE ... RETURNING prevents concurrent replay races)
      const { data: challengeRow, error: chErr } = await supabaseAdmin
        .from('passkey_challenges')
        .delete()
        .eq('id', challengeId)
        .eq('type', 'authentication')
        .select('id, challenge, expires_at')
        .maybeSingle();

      if (chErr || !challengeRow) {
        return res.status(400).json({ error: 'Sign-in challenge expired. Please tap "Sign in with Biometrics" again.' });
      }
      if (new Date(challengeRow.expires_at).getTime() < Date.now()) {
        return res.status(400).json({ error: 'Sign-in timed out. Please try again.' });
      }

      const { data: passkeyRow, error: pkErr } = await supabaseAdmin
        .from('user_passkeys')
        .select('id, user_id, credential_id, public_key, counter, transports')
        .eq('credential_id', credentialId)
        .maybeSingle();

      if (pkErr) {
        if (isMissingTableError(pkErr)) {
          return res.status(503).json({
            error: 'Biometric sign-in is not set up in Supabase yet.',
            code: 'PASSKEY_TABLE_MISSING',
          });
        }
        throw pkErr;
      }

      if (!passkeyRow) {
        return res.status(401).json({
          error: 'No account is linked to this biometric key. Sign in once with Google, Apple, or Email, then enable Biometric Sign-In in Profile → Settings.',
          code: 'PASSKEY_NOT_FOUND',
        });
      }

      const verification = await verifyAuthenticationResponse({
        response: credential,
        expectedChallenge: challengeRow.challenge,
        expectedOrigin: rpCtx.expectedOrigins,
        expectedRPID: rpCtx.rpID,
        credential: {
          id: passkeyRow.credential_id,
          publicKey: new Uint8Array(Buffer.from(passkeyRow.public_key, 'base64url')),
          counter: Number(passkeyRow.counter || 0),
          transports: Array.isArray(passkeyRow.transports) ? passkeyRow.transports : undefined,
        },
        requireUserVerification: true,
      });

      if (!verification.verified) {
        return res.status(401).json({ error: 'Biometric verification failed. Please try again.' });
      }

      await supabaseAdmin
        .from('user_passkeys')
        .update({
          counter: Number(verification.authenticationInfo.newCounter || 0),
          last_used_at: new Date().toISOString(),
        })
        .eq('id', passkeyRow.id);

      const { data: userLookup, error: userLookupErr } = await supabaseAdmin.auth.admin.getUserById(
        passkeyRow.user_id
      );

      if (userLookupErr || !userLookup?.user?.email) {
        return res.status(401).json({ error: 'Account could not be found for this passkey.' });
      }

      const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: userLookup.user.email,
      });

      const tokenHash = linkData?.properties?.hashed_token;
      if (linkErr || !tokenHash) {
        console.error('[Passkey] generateLink failed:', linkErr);
        return res.status(500).json({ error: 'Unable to open session after biometric verification.' });
      }

      return res.status(200).json({
        verified: true,
        email: userLookup.user.email,
        token_hash: tokenHash,
      });
    }

    return res.status(400).json({ error: 'Invalid passkey action.' });
  } catch (err: any) {
    console.error('[Passkey API] Error:', err?.message || err);
    return res.status(500).json({
      error: err?.message || 'Biometric authentication encountered an unexpected error.',
    });
  }
}
