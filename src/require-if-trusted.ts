import { TextEditor } from "atom"
import fs from "fs"
import crypto from "crypto"
import makeDebug from "debug"
const debug = makeDebug("js-hyperclick:require-if-trusted")

const hashFile = (filename: string): string => {
  const hash = crypto.createHash("sha1")
  hash.setEncoding("hex")
  hash.write(fs.readFileSync(filename))
  hash.end()
  return String(hash.read())
}

const fileHashes: { [filename: string]: string | undefined } = {}

const hasChanged = (filename: string, hash: string) =>
  fileHashes[filename] != null && fileHashes[filename] != hash

export type Fallback<T> = (trusted: boolean) => T

export type Require<T> = (moduleName: string) => T

const configKey = "js-hyperclick.trustedFiles"
interface TrustedFile {
  hash: string
  trusted: boolean
}

function updateTrust(hash: string, trusted: boolean) {
  const trustedFiles: TrustedFile[] = (atom.config.get(configKey) || []).filter(
    (tmp: TrustedFile) => tmp.hash !== hash,
  )

  const newConfig = [...trustedFiles, { hash, trusted }]
  debug("updateTrust", newConfig)

  atom.config.set(configKey, newConfig)
}

interface PromptArgs<T> {
  path: string
  hash: string
  lastHash: string | undefined
  fallback: Fallback<T>
}

function promptUser<T>({ path, hash, lastHash, fallback }: PromptArgs<T>) {
  const message = "js-hyperclick: Trust and execute this file?"
  let detail = `filename: ${path}\nhash: ${hash}`

  if (lastHash) {
    detail += `\nprevious hash: ${lastHash}`
    detail += `\nThe file has changed and atom must reload to use it.`
  }

  debug("promptUser", path)
  const options = {
    pending: atom.config.get("js-hyperclick.usePendingPanes"),
  }
  const untrustedFile = atom.workspace.open(path, options) as Promise<
    TextEditor
  >
  const notification = atom.notifications.addInfo(message, {
    detail,
    dismissable: true,
    buttons: [
      {
        text: lastHash ? "Trust & Restart" : "Trust",
        onDidClick() {
          updateTrust(hash, true)
          notification.dismiss()

          if (lastHash) {
            return atom.reload()
          }
          debug("Trust")
          fallback(true)
          untrustedFile.then(editor => {
            // Maybe destroy is an undocumented API on a TextEditor?
            // @ts-ignore
            editor.destroy()
          })
        },
      },
      {
        text: "Never",
        onDidClick() {
          updateTrust(hash, false)
          notification.dismiss()
        },
      },
    ],
  })
}

export default function makeRequire<T>(fallback: Fallback<T>): Require<T> {
  return function requireIfTrusted(path: string): T {
    const trustedFiles: TrustedFile[] = atom.config.get(configKey) || []

    const hash = hashFile(path)
    // Originally I was going to store the filename and a hash
    // (trustedFiles[path][hash] = true), but using a config key
    // that contains a dot causes it to get broken up
    // (trustedFiles['some-path']['js'][hash] = true)
    const { trusted } = trustedFiles.find(tmp => tmp.hash === hash) || {
      trusted: null,
    }

    const changed = hasChanged(path, hash)
    const lastHash = fileHashes[path]

    if (trusted && !changed) {
      fileHashes[path] = hash
      // $FlowExpectError
      return require(path)
    }

    if (trusted == null || changed) {
      promptUser({ path, hash, lastHash, fallback })
    }
    return fallback(false)
  }
}
