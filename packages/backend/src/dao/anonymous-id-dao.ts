import { KvWrapper } from "./kv-wrapper";

const ONE_WEEK = 60 * 60 * 24 * 7;

export class AnonymousIdDao {
    constructor(
        private hashedIp: string,
        private sessionTable: KVNamespace
    ){}

    private session: string | null = null

    async getIdentifier(): Promise<string> {
        if(this.session) {
            return this.session
        }

        const session = await this.sessionTable.get(this.hashedIp) ?? await AnonymousIdDao.hashIp(this.hashedIp, `${Date.now()}`)
        this.storeSession(session)
        this.session = session

        return session
    }

    private async storeSession(session: string) {
        this.sessionTable.put(this.hashedIp, session, {expirationTtl: ONE_WEEK})
    }
    
    static async hashIp(ip: string, salt = "") {
        const hashBuffer = await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(`${ip}${salt}`),
        );
        return this.toHexString(new Uint8Array(hashBuffer)).substring(0, 16);
    }

    // From: https://stackoverflow.com/questions/34309988/byte-array-to-hex-string-conversion-in-javascript
    private static toHexString(byteArray: Uint8Array): string {
        return Array.from(byteArray, (byte) => `0${(byte & 0xff).toString(16)}`.slice(-2)).join("");
    }
}
