import parse from 'url-parse'

import { IDIDManager, TAgent, TKeyType } from '@veramo/core'

interface CreateDefaultDidOptions {
  agent: TAgent<IDIDManager>
  baseUrl: string
  messagingServiceEndpoint?: string
}

export async function createDefaultDid(options: CreateDefaultDidOptions) {
  if (!options.agent) throw Error('[createDefaultDid] Agent is required')
  if (!options.baseUrl) throw Error('[createDefaultDid] baseUrl is required')

  const hostname = parse(options.baseUrl).hostname

  const serverIdentifier = await options?.agent?.didManagerGetOrCreate({
    provider: 'did:web',
    alias: hostname,
    options: {
      keyType: <TKeyType>'Ed25519',
    },
  })
  console.log('🆔', serverIdentifier?.did)

  if (serverIdentifier && options.messagingServiceEndpoint) {
    const messagingServiceEndpoint = options.baseUrl + options.messagingServiceEndpoint

    console.log('📨 Messaging endpoint', messagingServiceEndpoint)
    await options?.agent?.didManagerAddService({
      did: serverIdentifier.did,
      service: {
        id: serverIdentifier.did + '#msg',
        type: 'Messaging',
        description: 'Handles incoming POST messages',
        serviceEndpoint: messagingServiceEndpoint,
      },
    })
    // list DIDCommMessaging service at the same endpoint
    await options?.agent?.didManagerAddService({
      did: serverIdentifier.did,
      service: {
        id: serverIdentifier.did + '#msg-didcomm',
        type: 'DIDCommMessaging',
        description: 'Handles incoming DIDComm messages',
        serviceEndpoint: messagingServiceEndpoint,
      },
    })
  }
}
