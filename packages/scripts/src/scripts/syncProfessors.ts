import { cloudflareKVInit } from '../wrappers/kv-wrapper.js';
import {PolyratingsWorkerWrapper} from '../wrappers/worker-wrapper.js'

const ACCOUNT_ID = '4b59b59a6058dce1832781075d4fde9d'
const BETA_PROFESSOR_KV = '3a5904587fe943679bf97e59d95b7632'
const DEV_PROFESSOR_KV = '20700dd12582422b9f91a0a1695ace88'
const SERVICE_URL = 'https://polyratings-prod-backend.addison-polyratings.workers.dev/'

export async function syncProfessors() {
    const KV = cloudflareKVInit(process.env.CF_API_KEY as string, process.env.CF_EMAIL as string)
    const betaProfessorKv = new KV(ACCOUNT_ID, BETA_PROFESSOR_KV)
    const devProfessorKv = new KV(ACCOUNT_ID, DEV_PROFESSOR_KV)

    console.log("Removing professors from beta")
    const betaKeys = await betaProfessorKv.getAllKeys()
    await betaProfessorKv.deleteValues(betaKeys)

    console.log("Removing professors from dev")
    const devKeys = await betaProfessorKv.getAllKeys()
    await devProfessorKv.deleteValues(devKeys)

    console.log("Getting professors from prod")
    const polyratingsProdWorker = new PolyratingsWorkerWrapper(SERVICE_URL)
    await polyratingsProdWorker.login(process.env.POLYRATINGS_CI_USERNAME as string, process.env.POLYRATINGS_CI_PASSWORD as string)
    const professorEntries = await polyratingsProdWorker.professorEntries()
    console.log(`Got ${professorEntries.length} professors from prod`)
    
    const pairs = professorEntries.map(([key,value]) => ({key, value: JSON.stringify(value)}))

    console.log("Putting professors in beta")
    await betaProfessorKv.putValues(pairs)

    console.log("Putting professors in dev")
    await devProfessorKv.putValues(pairs)
}
