import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  QueryConstraint,
  DocumentData,
  QuerySnapshot,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from './firebase/config';
import { MissingPerson } from '@/types/missing-person';

export class FirestoreService {
  private static readonly COLLECTION_NAME = 'missing_persons';

  /**
   * Get missing persons with optional filtering and pagination
   */
  static async getMissingPersons(options: {
    category?: string;
    status?: string;
    state?: string;
    city?: string;
    limitCount?: number;
    lastDoc?: any;
    searchTerm?: string;
  } = {}): Promise<{ data: MissingPerson[]; hasMore: boolean; lastDoc?: any }> {
    try {
      const constraints: QueryConstraint[] = [];

      // Add filters
      if (options.category) {
        constraints.push(where('category', '==', options.category));
      }
      if (options.status) {
        constraints.push(where('status', '==', options.status));
      }
      if (options.state) {
        constraints.push(where('state', '==', options.state));
      }
      if (options.city) {
        constraints.push(where('city', '==', options.city));
      }

      // Add ordering (required for pagination)
      constraints.push(orderBy('createdAt', 'desc'));

      // Add pagination
      if (options.lastDoc) {
        constraints.push(startAfter(options.lastDoc));
      }

      // Add limit (default 100, get one extra to check if there are more)
      const limitCount = options.limitCount || 100;
      constraints.push(limit(limitCount + 1));

      const q = query(collection(db, this.COLLECTION_NAME), ...constraints);
      const querySnapshot = await getDocs(q);

      const docs = querySnapshot.docs;
      const hasMore = docs.length > limitCount;

      // Remove the extra document if we have more than the limit
      if (hasMore) {
        docs.pop();
      }

      const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;

      let missingPersons: MissingPerson[] = docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as MissingPerson));

      // Apply search filter if provided (client-side for now)
      if (options.searchTerm) {
        const searchLower = options.searchTerm.toLowerCase();
        missingPersons = missingPersons.filter(person => 
          person.name?.toLowerCase().includes(searchLower) ||
          person.location?.toLowerCase().includes(searchLower) ||
          person.city?.toLowerCase().includes(searchLower) ||
          person.caseNumber?.toLowerCase().includes(searchLower)
        );
      }

      return { data: missingPersons, hasMore, lastDoc };
    } catch (error) {
      console.error('Error getting missing persons:', error);
      throw error;
    }
  }

  /**
   * Get a specific missing person by ID
   */
  static async getMissingPerson(id: string): Promise<MissingPerson | null> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as MissingPerson;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting missing person:', error);
      throw error;
    }
  }

  /**
   * Add a new missing person
   */
  static async addMissingPerson(person: Omit<MissingPerson, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), {
        ...person,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding missing person:', error);
      throw error;
    }
  }

  /**
   * Update a missing person
   */
  static async updateMissingPerson(id: string, updates: Partial<MissingPerson>): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating missing person:', error);
      throw error;
    }
  }

  /**
   * Delete a missing person
   */
  static async deleteMissingPerson(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting missing person:', error);
      throw error;
    }
  }

  /**
   * Get statistics about missing persons
   */
  static async getStatistics(): Promise<{
    total: number;
    categories: Record<string, number>;
    statuses: Record<string, number>;
    states: Record<string, number>;
  }> {
    try {
      const querySnapshot = await getDocs(collection(db, this.COLLECTION_NAME));

      const stats = {
        total: 0,
        categories: {} as Record<string, number>,
        statuses: {} as Record<string, number>,
        states: {} as Record<string, number>
      };

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        stats.total++;

        // Count categories
        const category = data.category || 'Unknown';
        stats.categories[category] = (stats.categories[category] || 0) + 1;

        // Count statuses
        const status = data.status || 'Unknown';
        stats.statuses[status] = (stats.statuses[status] || 0) + 1;

        // Count states
        const state = data.state || 'Unknown';
        stats.states[state] = (stats.states[state] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error getting statistics:', error);
      throw error;
    }
  }

  /**
   * Search missing persons by name or location
   */
  static async searchMissingPersons(searchTerm: string, limitCount: number = 50): Promise<MissingPerson[]> {
    try {
      // For better search, we'll get a larger dataset and filter client-side
      // In production, consider using Algolia or implementing server-side search
      const result = await this.getMissingPersons({ 
        limitCount: limitCount * 3,
        searchTerm 
      });

      return result.data.slice(0, limitCount);
    } catch (error) {
      console.error('Error searching missing persons:', error);
      throw error;
    }
  }

  /**
   * Get missing persons by category with caching
   */
  static async getMissingPersonsByCategory(category: string, limitCount: number = 100): Promise<MissingPerson[]> {
    try {
      const result = await this.getMissingPersons({ category, limitCount });
      return result.data;
    } catch (error) {
      console.error('Error getting missing persons by category:', error);
      throw error;
    }
  }

  /**
   * Get recent missing persons (last 30 days)
   */
  static async getRecentMissingPersons(limitCount: number = 20): Promise<MissingPerson[]> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('createdAt', '>=', thirtyDaysAgo),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as MissingPerson));
    } catch (error) {
      console.error('Error getting recent missing persons:', error);
      throw error;
    }
  }

  /**
   * Batch add multiple missing persons (for migration)
   */
  static async batchAddMissingPersons(persons: Omit<MissingPerson, 'id'>[]): Promise<void> {
    try {
      const batch = [];
      for (const person of persons) {
        const docRef = doc(collection(db, this.COLLECTION_NAME));
        batch.push(addDoc(collection(db, this.COLLECTION_NAME), {
          ...person,
          createdAt: new Date(),
          updatedAt: new Date()
        }));
      }

      await Promise.all(batch);
    } catch (error) {
      console.error('Error batch adding missing persons:', error);
      throw error;
    }
  }
}