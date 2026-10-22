import type { JWTVerifyGetKey } from 'jose';

const loadJose: () => Promise<typeof import('jose')> = require('./jose-loader.cjs');
export const AUDIENCE = 'https://jobdongsani.co.kr/api/arl-preview/deploy';
export const ISSUER = 'https://token.actions.githubusercontent.com';
const REPOSITORY = 'Strangekim/AcousticRealityLab';
const REPOSITORY_ID = '1428258581';
const OWNER_ID = '114288288';
const WORKFLOW = `${REPOSITORY}/.github/workflows/preview.yml@refs/heads/main`;

export class PreviewError extends Error {
    constructor(public status: number, message: string) { super(message); }
}

export interface Identity {
    sha: string;
    runId: string;
    runNumber: string;
    runAttempt: string;
    id: string;
}

function positiveInteger(value: unknown): value is string {
    return typeof value === 'string' && /^[1-9][0-9]{0,17}$/.test(value);
}

export function identityFromClaims(claims: Record<string, unknown>): Identity {
    const subjects = [
        `repo:${REPOSITORY}:ref:refs/heads/main`,
        `repo:Strangekim@${OWNER_ID}/AcousticRealityLab@${REPOSITORY_ID}:ref:refs/heads/main`,
    ];
    if (claims.repository !== REPOSITORY || claims.repository_id !== REPOSITORY_ID ||
        claims.repository_owner_id !== OWNER_ID || claims.ref !== 'refs/heads/main' ||
        claims.ref_type !== 'branch' || claims.workflow_ref !== WORKFLOW ||
        !['push', 'workflow_dispatch'].includes(String(claims.event_name)) ||
        !subjects.includes(String(claims.sub)) || typeof claims.sha !== 'string' ||
        !/^[a-f0-9]{40}$/.test(claims.sha) || !positiveInteger(claims.run_id) ||
        !positiveInteger(claims.run_number) || !positiveInteger(claims.run_attempt)) {
        throw new PreviewError(403, 'This workflow is not authorized to deploy ARL.');
    }
    return {
        sha: claims.sha, runId: claims.run_id, runNumber: claims.run_number,
        runAttempt: claims.run_attempt, id: `${claims.sha}-${claims.run_id}-${claims.run_attempt}`,
    };
}

export function createVerifier(testKey?: JWTVerifyGetKey) {
    let key: JWTVerifyGetKey | undefined = testKey;
    return async (authorization: string | undefined): Promise<Identity> => {
        if (!authorization || !/^Bearer [A-Za-z0-9._-]+$/.test(authorization) || authorization.length > 16384) {
            throw new PreviewError(401, 'A GitHub Actions OIDC token is required.');
        }
        try {
            const { createRemoteJWKSet, jwtVerify } = await loadJose();
            key ??= createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks`));
            const { payload } = await jwtVerify(authorization.slice(7), key, {
                algorithms: ['RS256'], issuer: ISSUER, audience: AUDIENCE,
                requiredClaims: ['exp', 'iat', 'nbf', 'sub'], clockTolerance: 10,
                maxTokenAge: '10m',
            });
            return identityFromClaims(payload);
        } catch (error) {
            if (error instanceof PreviewError) throw error;
            // Never include the token, request, JWT library details or signing keys in logs/errors.
            throw new PreviewError(401, 'The deployment token is invalid or expired.');
        }
    };
}
