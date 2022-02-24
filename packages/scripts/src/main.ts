import { syncProfessors } from "./scripts/syncProfessors.js"
import * as dotenv from 'dotenv'
dotenv.config()

async function main() {
    await executeOrPrintError(syncProfessors)
}

async function executeOrPrintError(fn:() => Promise<void>) {
    try {
        await fn()
    } catch(e) {
        console.log(`Failed to run ${fn.name}\n`, `Got Error: ${(e as Error).toString()}`)
    }
}

main()
