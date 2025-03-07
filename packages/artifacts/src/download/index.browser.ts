import { Project, projects } from '../projects'
import type { SnarkArtifacts, UltranHonkArtifacts, Version } from './types'
import { getBaseUrl } from './urls'

export default async function maybeGetSnarkArtifacts(
  project: Project,
  options: {
    parameters?: (bigint | number | string)[]
    version?: Version
  } = {},
): Promise<SnarkArtifacts> {
  if (!projects.includes(project)) throw new Error(`Project '${project}' is not supported`)

  options.version ??= 'latest'
  const url = getBaseUrl(project, options.version)
  const parameters = options.parameters ? `-${options.parameters.join('-')}` : ''

  return {
    wasm: `${url}${parameters}.wasm`,
    zkey: `${url}${parameters}.zkey`,
  }
}

export async function maybeGetUltranHonkArtifacts(
  project: Project,
  options: {
    parameters?: (bigint | number | string)[]
    version?: Version
  } = {},
): Promise<UltranHonkArtifacts> {
  if (![Project.SEMAPHORE_NOIR].includes(project)) throw new Error(`Project '${project}' is not supported`)

  options.version ??= 'latest'
  const parameters = options.parameters ? `-${options.parameters.join('-')}` : ''

  const baseUrl =
    'https://raw.githubusercontent.com/ModoriLabs/snark-artifacts/refs/heads/main/packages/semaphore-noir/semaphore'

  return {
    bytecode: `${baseUrl}${parameters}.bytecode`,
    abi: `${baseUrl}${parameters}.abi`,
  }
}
