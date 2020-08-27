import { AbstractIdentityProvider } from './abstract-identity-provider'
import {
  IAgentPlugin,
  IIdentity,
  IAgentContext,
  IIdentityManager,
  IKeyManager,
  IIdentityManagerGetIdentityArgs,
  IIdentityManagerCreateIdentityArgs,
  IIdentityManagerGetOrCreateIdentityArgs,
  IIdentityManagerDeleteIdentityArgs,
  IIdentityManagerAddKeyArgs,
  IIdentityManagerRemoveKeyArgs,
  IIdentityManagerAddServiceArgs,
  IIdentityManagerRemoveServiceArgs,
} from 'daf-core'
import { AbstractIdentityStore } from './abstract-identity-store'

/**
 * Agent plugin that implements {@link daf-core#IIdentityManager} interface
 * @public
 */
export class IdentityManager implements IAgentPlugin {
  /**
   * Plugin methods
   * @public
   */
  readonly methods: IIdentityManager

  private providers: Record<string, AbstractIdentityProvider>
  private defaultProvider: string
  private store: AbstractIdentityStore

  constructor(options: {
    providers: Record<string, AbstractIdentityProvider>
    defaultProvider: string
    store: AbstractIdentityStore
  }) {
    this.providers = options.providers
    this.defaultProvider = options.defaultProvider
    this.store = options.store
    this.methods = {
      identityManagerGetProviders: this.identityManagerGetProviders.bind(this),
      identityManagerGetIdentities: this.identityManagerGetIdentities.bind(this),
      identityManagerGetIdentity: this.identityManagerGetIdentity.bind(this),
      identityManagerCreateIdentity: this.identityManagerCreateIdentity.bind(this),
      identityManagerGetOrCreateIdentity: this.identityManagerGetOrCreateIdentity.bind(this),
      identityManagerImportIdentity: this.identityManagerImportIdentity.bind(this),
      identityManagerDeleteIdentity: this.identityManagerDeleteIdentity.bind(this),
      identityManagerAddKey: this.identityManagerAddKey.bind(this),
      identityManagerRemoveKey: this.identityManagerRemoveKey.bind(this),
      identityManagerAddService: this.identityManagerAddService.bind(this),
      identityManagerRemoveService: this.identityManagerRemoveService.bind(this),
    }
  }

  private getProvider(name: string): AbstractIdentityProvider {
    const provider = this.providers[name]
    if (!provider) throw Error('Identity provider does not exist: ' + name)
    return provider
  }

  /** {@inheritDoc daf-core#IIdentityManager.identityManagerGetProviders} */
  async identityManagerGetProviders(): Promise<string[]> {
    return Object.keys(this.providers)
  }

  /** {@inheritDoc daf-core#IIdentityManager.identityManagerGetIdentities} */
  async identityManagerGetIdentities(): Promise<IIdentity[]> {
    return this.store.list()
  }

  /** {@inheritDoc daf-core#IIdentityManager.identityManagerGetIdentity} */
  async identityManagerGetIdentity({ did }: IIdentityManagerGetIdentityArgs): Promise<IIdentity> {
    return this.store.get({ did })
  }

  /** {@inheritDoc daf-core#IIdentityManager.identityManagerCreateIdentity} */
  async identityManagerCreateIdentity(
    { provider, alias, kms, options }: IIdentityManagerCreateIdentityArgs,
    context: IAgentContext<IKeyManager>,
  ): Promise<IIdentity> {
    const providerName = provider || this.defaultProvider
    const identityProvider = this.getProvider(providerName)
    const partialIdentity = await identityProvider.createIdentity({ kms, alias, options }, context)
    const identity: IIdentity = { ...partialIdentity, alias, provider: providerName }
    await this.store.import(identity)
    return identity
  }

  /** {@inheritDoc daf-core#IIdentityManager.identityManagerGetOrCreateIdentity} */
  async identityManagerGetOrCreateIdentity(
    { provider, alias, kms, options }: IIdentityManagerGetOrCreateIdentityArgs,
    context: IAgentContext<IKeyManager>,
  ): Promise<IIdentity> {
    try {
      const identity = await this.store.get({ alias })
      return identity
    } catch {
      return this.identityManagerCreateIdentity({ provider, alias, kms, options }, context)
    }
  }

  /** {@inheritDoc daf-core#IIdentityManager.identityManagerImportIdentity} */
  async identityManagerImportIdentity(identity: IIdentity): Promise<IIdentity> {
    await this.store.import(identity)
    return identity
  }

  /** {@inheritDoc daf-core#IIdentityManager.identityManagerDeleteIdentity} */
  async identityManagerDeleteIdentity(
    { did }: IIdentityManagerDeleteIdentityArgs,
    context: IAgentContext<IKeyManager>,
  ): Promise<boolean> {
    const identity = await this.store.get({ did })
    const provider = this.getProvider(identity.provider)
    await provider.deleteIdentity(identity, context)
    return this.store.delete({ did })
  }

  /** {@inheritDoc daf-core#IIdentityManager.identityManagerAddKey} */
  async identityManagerAddKey(
    { did, key, options }: IIdentityManagerAddKeyArgs,
    context: IAgentContext<IKeyManager>,
  ): Promise<any> {
    const identity = await this.store.get({ did })
    const provider = this.getProvider(identity.provider)
    const result = await provider.addKey({ identity, key, options }, context)
    identity.keys.push(key)
    await this.store.import(identity)
    return result
  }

  /** {@inheritDoc daf-core#IIdentityManager.identityManagerRemoveKey} */
  async identityManagerRemoveKey(
    { did, kid, options }: IIdentityManagerRemoveKeyArgs,
    context: IAgentContext<IKeyManager>,
  ): Promise<any> {
    const identity = await this.store.get({ did })
    const provider = this.getProvider(identity.provider)
    const result = await provider.removeKey({ identity, kid, options }, context)
    identity.keys = identity.keys.filter((k) => k.kid !== kid)
    await this.store.import(identity)
    return result
  }

  /** {@inheritDoc daf-core#IIdentityManager.identityManagerAddService} */
  async identityManagerAddService(
    { did, service, options }: IIdentityManagerAddServiceArgs,
    context: IAgentContext<IKeyManager>,
  ): Promise<any> {
    const identity = await this.store.get({ did })
    const provider = this.getProvider(identity.provider)
    const result = await provider.addService({ identity, service, options }, context)
    identity.services.push(service)
    await this.store.import(identity)
    return result
  }

  /** {@inheritDoc daf-core#IIdentityManager.identityManagerRemoveService} */
  async identityManagerRemoveService(
    { did, id, options }: IIdentityManagerRemoveServiceArgs,
    context: IAgentContext<IKeyManager>,
  ): Promise<any> {
    const identity = await this.store.get({ did })
    const provider = this.getProvider(identity.provider)
    const result = await provider.removeService({ identity, id, options }, context)
    identity.services = identity.services.filter((s) => s.id !== id)
    await this.store.import(identity)
    return result
  }
}
