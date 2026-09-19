/** Where the session stands. `unknown` lasts only until the app initializer has asked the server. */
export type AuthStatus = 'unknown' | 'authenticated' | 'anonymous';

/** Which message the sign-in screen should show. Never says which field was wrong. */
export type LoginFailure = 'credentials' | 'network' | 'server' | 'disabled' | 'throttled';

/**
 * How the server hands over the refresh token. `cookie` is an HttpOnly cookie the page never sees.
 * `body` is for hosting that puts the web app and the API on different sites, where that cookie
 * cannot work, so the token comes back in the response and the web app keeps it.
 */
export type RefreshTransport = 'cookie' | 'body';

export interface TokenGrant {
    access_token: string;
    expires_in: number;
    session_id: string;
    refresh_transport: RefreshTransport;
    refresh_token?: string;
}

export interface SignInGrant extends TokenGrant {
    user: { id: string; email: string; name: string; role: string | null };
}

/** What survives a reload, shared by every tab. Never the access token, which lives in memory only. */
export interface StoredSession {
    transport: RefreshTransport;
    refresh_token?: string;
    /** Which session this is, so another tab can tell a renewal from a different sign-in. */
    session_id: string;
    /** Not kept means it lasts while the browser is open, the way a session cookie does. */
    remember: boolean;
}

/** Why a session ended, in the terms the session-ended page has copy for. */
export type SessionEndReason = 'expired' | 'signed-out' | 'signed-out-elsewhere' | 'password-changed' | 'account-disabled' | 'security';

/** What a refused renewal says. `ended_reason` is the server's own name for why the session ended. */
export interface RefusalDetail {
    reason: 'missing' | 'invalid' | 'ended' | 'expired' | 'reuse';
    ended_reason: string | null;
}

/** One device signed in to the account, as the signed-in devices list shows it. */
export interface ActiveSession {
    id: string;
    current: boolean;
    /** Named by the server from the user agent. Null parts mean it could not tell. */
    device: { browser: string | null; os: string | null; type: 'desktop' | 'phone' | 'tablet' };
    ip_address: string | null;
    remember: boolean;
    signed_in_on: string;
    last_used_on: string;
}

/** A sign-out the server has not confirmed yet, replayed on the next load. */
export interface PendingSignOut {
    refresh_token?: string;
}
