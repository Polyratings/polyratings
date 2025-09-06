/*
What is this file and does Polyratings track users?
Due to administrative reasons we decided we needed a way to associate ratings and reports that were written by the same user. This was done for 
multiple reasons:

1. Mass delete a user that was trying to spam bad ratings for a professor
2. Some people accidentally posted a rating in the wrong place and wanted it removed. Confirming this would be nice
3. Disagreements over rating between individuals became a back and forth spamming of ratings and reports. It would be useful to disambiguate parties

For these reasons we decided we needed to associate an identifier with each user of Polyratings that could correlate actions of a period of 
multiple days. However, this identifier will ALWAYS be ANONYMOUS, and even we the developers no way to de-anonymize user. We decided to derive 
this identifier from the users IP address but we NEVER store the IP directly anywhere. Instead we use the hash of the IP to associate it with
a session id. In addition, since we are committed to open data we did not want to remove this identifier from the public Github dataset, we
needed to make sure that session ids did not allow for a writing comparison de-anonymization. As such we evaluated two options for implementation:

1. Sessions would be a combination of a hashed ip with a certain time identifier. For ex: the week+month+year or the month+year. The benefit
of this is that it is simple and only requires a single KV read if the session is found. The disadvantage is that if the offending behavior falls
on a roll over period we can loose the benefit of having sessions in the first place

2. Sessions are allocated on a rolling period using KV ttl feature. Effectively any time a user does a write operation to polyratings the time of 
the session gets extended by another 7 days. Once the 7 days are up the session id gets deleted. The only disadvantage of this strategy is that a
read and write is always needed since the ttl has to be extended

We decided to go with the second option due to the administrative advantage. To compensate for the performance difference we can decide to not await
the write to the KV. Worst case-scenario the extended TTL is not written to the KV but this is an extremely unlikely outcome since other kv writes 
will happen in other daos after the `getIdentifier` function call.
*/

const ONE_WEEK = 60 * 60 * 24 * 7;

export class AnonymousIdDao {
    constructor(
        private hashedIp: string,
        private sessionTable: KVNamespace,
    ) {}

    private session: string | null = null;

    async getIdentifier(): Promise<string> {
        if (this.session) {
            return this.session;
        }

        const session =
            (await this.sessionTable.get(this.hashedIp)) ??
            (await AnonymousIdDao.hashIp(this.hashedIp, `${Date.now()}`));
        // Do not await the store session as there is no need explained above
        this.storeSession(session);
        this.session = session;

        return session;
    }

    private async storeSession(session: string) {
        this.sessionTable.put(this.hashedIp, session, { expirationTtl: ONE_WEEK });
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
