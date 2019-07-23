
export type Resolved =
  | { type: "url", url: string }
  | { type: "file", filename: string | null | undefined }
