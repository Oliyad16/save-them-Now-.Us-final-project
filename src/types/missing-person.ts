export interface MissingPerson {
  id: number
  name: string
  date: string
  status: string
  category: string
  reportedMissing: string
  location: string
  latitude?: number
  longitude?: number
  age?: number
  gender?: string
  ethnicity?: string
  description?: string
  circumstances?: string
  photo?: string
  caseNumber?: string
}