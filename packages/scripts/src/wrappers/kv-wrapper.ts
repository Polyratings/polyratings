import { chunkArray } from "../utils/chunkArray.js"
import { v4 as uuidv4 } from 'uuid';
import fetch, {Response, RequestInit} from 'node-fetch'

const CLOUDFLARE_API_BASE_URL = 'https://api.cloudflare.com/client/v4/'
export function cloudflareKVInit(authKey:string, authEmail:string) {
    return class {

        constructor(
            private accountId:string,
            private namespaceId:string
        ){}
        
        private async cloudflareFetch(url: string, init?: RequestInit):Promise<Response> {
            let options = init || {}
            options.headers = {
                'X-Auth-Key': authKey,
                'X-Auth-Email': authEmail
            }
            if(init?.body) {
                options.headers['Content-Type'] = 'application/json'
            }
            
            const res = await fetch(url, options)

            if(res.status != 200) {
                throw new Error(res.statusText)
            }

            return res
        }

        async getAllKeys() {
            let cursor = ''
            let keyList:string[] = []
            do {
                let url = `${CLOUDFLARE_API_BASE_URL}accounts/${this.accountId}/storage/kv/namespaces/${this.namespaceId}/keys`
                if(cursor) {
                    url = url + '?' + new URLSearchParams({cursor})
                }
                const res = await this.cloudflareFetch(url)
                const body = await res.json() as any
                keyList = keyList.concat(body.result.map((o:any) => o.name))
                cursor = body.result_info.cursor
            } while(cursor)

            console.log(`Got ${keyList.length} number of keys from ${this.namespaceId}`)
        
            return keyList
        }

        async putValues(values:{key:string, value:string}[]) {
            const chunkSize = 500
            const chunks = chunkArray(values, chunkSize)
            for(let [i, chunk] of chunks.entries()) {
                console.log(`Uploading chunk ${i * chunkSize} - ${(i + 1) * chunkSize} / ${values.length} to ${this.namespaceId}`)
                const res = await this.cloudflareFetch(`${CLOUDFLARE_API_BASE_URL}accounts/${this.accountId}/storage/kv/namespaces/${this.namespaceId}/bulk`, {
                    method: "PUT",
                    body: JSON.stringify(chunk)
                })
            }
        }

        async deleteValues(keys:string[]) {
            if(!keys.length) {
                // No work to be done
                return
            }
            await this.cloudflareFetch(`${CLOUDFLARE_API_BASE_URL}accounts/${this.accountId}/storage/kv/namespaces/${this.namespaceId}/bulk`, {
                method: "DELETE",
                body: JSON.stringify(keys)
            })
            console.log(`Deleted ${keys.length} from ${this.namespaceId}`)
        }

    }
}
