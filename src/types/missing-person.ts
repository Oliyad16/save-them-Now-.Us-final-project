export interface MissingPerson {
  id: string | number
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
  // Firestore-specific fields
  city?: string
  state?: string
  county?: string
  legalFirstName?: string
  legalLastName?: string
  biologicalSex?: string
  raceEthnicity?: string
  missingAge?: string
  dateModified?: string
  dateMissing?: string
  createdAt?: Date | any
  updatedAt?: Date | any
}