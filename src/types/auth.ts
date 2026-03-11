export type AuthScope =
  | 'GIGACHAT_API_PERS'
  | 'GIGACHAT_API_B2B'
  | 'GIGACHAT_API_CORP'

export interface AuthData {
  credentials: string
  scope: AuthScope
}
