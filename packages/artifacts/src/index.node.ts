export { download, maybeDownload } from './download/download'
export * from './index.shared'
import maybeGetSnarkArtifacts from './download/index.node'
import { maybeGetUltraHonkArtifacts } from './download/index.node'
export { maybeGetSnarkArtifacts, maybeGetUltraHonkArtifacts }
