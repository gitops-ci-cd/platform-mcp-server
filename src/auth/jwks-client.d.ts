declare module "jwks-client" {
  export interface JwksClientOptions {
    jwksUri: string;
    requestHeaders?: Record<string, string>;
    timeout?: number;
    cache?: boolean;
    cacheMaxAge?: number;
    rateLimit?: boolean;
    jwksRequestsPerMinute?: number;
  }

  export interface SigningKey {
    getPublicKey(): string;
    getPublicKey(callback: (err: Error | null, publicKey: string) => void): void;
    rsaPublicKey?: string;
    publicKey?: string;
  }

  export class JwksClient {
    constructor(options: JwksClientOptions);
    getSigningKey(kid: string): Promise<SigningKey>;
    getSigningKey(kid: string, callback: (err: Error | null, key: SigningKey) => void): void;
  }

  export default function jwksClient(options: JwksClientOptions): JwksClient;
}
