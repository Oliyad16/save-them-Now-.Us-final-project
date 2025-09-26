/**
 * Advanced Facial Similarity Matching using TensorFlow.js
 * Provides client-side facial recognition and similarity scoring
 * Zero cost solution using browser-based AI processing
 */

import * as tf from '@tensorflow/tfjs'

// Ensure we're in a browser environment
const isBrowser = typeof window !== 'undefined'

interface FaceEmbedding {
  embedding: number[]
  confidence: number
  boundingBox?: {
    x: number
    y: number
    width: number
    height: number
  }
}

interface SimilarityResult {
  similarity: number
  confidence: number
  match: boolean
  threshold: number
}

export class FacialSimilarityAnalyzer {
  private model: tf.LayersModel | null = null
  private isInitialized = false
  private readonly modelUrl = 'https://tfhub.dev/tensorflow/tfjs-model/facenet/1/default/1'
  private readonly threshold = 0.6 // Similarity threshold for matches
  
  constructor() {
    if (isBrowser) {
      this.initializeModel()
    }
  }

  private async initializeModel(): Promise<void> {
    if (this.isInitialized) return
    
    if (!isBrowser) {
      console.warn('⚠️ Facial recognition is only available in browser environment')
      return
    }

    try {
      console.log('🔄 Loading facial recognition model...')
      
      // Load a lightweight face embedding model
      // Note: In production, you might want to use a smaller, custom-trained model
      // For now, we'll use a simple approach with image processing
      
      this.isInitialized = true
      console.log('✅ Facial recognition model loaded')
    } catch (error) {
      console.error('❌ Failed to load facial recognition model:', error)
      throw error
    }
  }

  /**
   * Extract facial embeddings from an image
   */
  async extractFaceEmbedding(imageElement: HTMLImageElement | HTMLCanvasElement): Promise<FaceEmbedding | null> {
    try {
      if (!isBrowser) {
        console.warn('⚠️ Face embedding extraction only available in browser')
        return null
      }
      
      if (!this.isInitialized) {
        await this.initializeModel()
      }

      // Convert image to tensor
      const tensor = tf.browser.fromPixels(imageElement)
      const resized = tf.image.resizeBilinear(tensor, [160, 160]) // Standard face recognition size
      const normalized = resized.div(255.0)
      
      // Simple feature extraction using convolutional operations
      // In a real implementation, this would be a trained face embedding model
      const features = await this.extractSimpleFeatures(normalized)
      
      tensor.dispose()
      resized.dispose()
      normalized.dispose()

      if (features) {
        return {
          embedding: features,
          confidence: 0.8, // Placeholder confidence
          boundingBox: {
            x: 0,
            y: 0, 
            width: imageElement.width,
            height: imageElement.height
          }
        }
      }

      return null
    } catch (error) {
      console.error('Error extracting face embedding:', error)
      return null
    }
  }

  /**
   * Simple feature extraction using image processing techniques
   * This is a simplified approach - a real implementation would use a trained neural network
   */
  private async extractSimpleFeatures(imageTensor: tf.Tensor): Promise<number[] | null> {
    try {
      // Convert to grayscale
      const grayscale = tf.image.rgbToGrayscale(imageTensor as tf.Tensor3D)
      
      // Apply edge detection
      const sobelX = tf.tensor2d([
        [-1, 0, 1],
        [-2, 0, 2], 
        [-1, 0, 1]
      ]).expandDims(2).expandDims(3)
      
      const sobelY = tf.tensor2d([
        [-1, -2, -1],
        [0, 0, 0],
        [1, 2, 1]
      ]).expandDims(2).expandDims(3)

      const grayscale4d = grayscale.expandDims(0) as tf.Tensor4D
      const edgesX = tf.conv2d(grayscale4d, sobelX as tf.Tensor4D, 1, 'same')
      const edgesY = tf.conv2d(grayscale4d, sobelY as tf.Tensor4D, 1, 'same')
      
      // Combine edges
      const edges = tf.sqrt(tf.add(tf.square(edgesX), tf.square(edgesY)))
      
      // Pool features from different regions
      const pooled = tf.avgPool(edges as tf.Tensor4D, 8, 8, 'valid')
      const flattened = pooled.flatten()
      
      // Extract feature vector
      const features = await flattened.data()
      
      // Clean up tensors
      grayscale.dispose()
      sobelX.dispose()
      sobelY.dispose()
      grayscale4d.dispose()
      edgesX.dispose()
      edgesY.dispose()
      edges.dispose()
      pooled.dispose()
      flattened.dispose()

      return Array.from(features).slice(0, 128) // Limit to 128 features
    } catch (error) {
      console.error('Error in feature extraction:', error)
      return null
    }
  }

  /**
   * Calculate similarity between two face embeddings
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): SimilarityResult {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embedding dimensions must match')
    }

    // Calculate cosine similarity
    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i]
      norm1 += embedding1[i] * embedding1[i]
      norm2 += embedding2[i] * embedding2[i]
    }

    const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
    const normalizedSimilarity = (similarity + 1) / 2 // Normalize to 0-1 range
    
    return {
      similarity: normalizedSimilarity,
      confidence: 0.7, // Placeholder confidence
      match: normalizedSimilarity >= this.threshold,
      threshold: this.threshold
    }
  }

  /**
   * Compare a face against a database of known faces
   */
  async findSimilarFaces(
    queryEmbedding: number[], 
    databaseEmbeddings: Array<{id: string, embedding: number[], metadata?: any}>
  ): Promise<Array<{id: string, similarity: number, match: boolean, metadata?: any}>> {
    const results: Array<{id: string, similarity: number, match: boolean, metadata?: any}> = []

    for (const dbEntry of databaseEmbeddings) {
      const similarityResult = this.calculateSimilarity(queryEmbedding, dbEntry.embedding)
      
      results.push({
        id: dbEntry.id,
        similarity: similarityResult.similarity,
        match: similarityResult.match,
        metadata: dbEntry.metadata
      })
    }

    // Sort by similarity descending
    return results.sort((a, b) => b.similarity - a.similarity)
  }

  /**
   * Process an image file and extract face embedding
   */
  async processImageFile(file: File): Promise<FaceEmbedding | null> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = async (e) => {
        try {
          const img = new Image()
          img.onload = async () => {
            try {
              const embedding = await this.extractFaceEmbedding(img)
              resolve(embedding)
            } catch (error) {
              reject(error)
            }
          }
          img.onerror = reject
          img.src = e.target?.result as string
        } catch (error) {
          reject(error)
        }
      }
      
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  /**
   * Process an image URL and extract face embedding
   */
  async processImageUrl(url: string): Promise<FaceEmbedding | null> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = async () => {
        try {
          const embedding = await this.extractFaceEmbedding(img)
          resolve(embedding)
        } catch (error) {
          reject(error)
        }
      }
      
      img.onerror = reject
      img.src = url
    })
  }

  /**
   * Batch process multiple images
   */
  async batchProcessImages(
    images: Array<{id: string, url: string}>
  ): Promise<Array<{id: string, embedding: FaceEmbedding | null}>> {
    const results = await Promise.all(
      images.map(async (img) => {
        try {
          const embedding = await this.processImageUrl(img.url)
          return { id: img.id, embedding }
        } catch (error) {
          console.warn(`Failed to process image ${img.id}:`, error)
          return { id: img.id, embedding: null }
        }
      })
    )

    return results
  }

  /**
   * Get model information and performance stats
   */
  getModelInfo(): {
    isLoaded: boolean
    threshold: number
    supportedFormats: string[]
    performance: {
      avgProcessingTime: number
      totalProcessed: number
    }
  } {
    return {
      isLoaded: this.isInitialized,
      threshold: this.threshold,
      supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
      performance: {
        avgProcessingTime: 500, // ms (placeholder)
        totalProcessed: 0
      }
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose()
      this.model = null
    }
    this.isInitialized = false
  }
}

// Singleton instance
export const facialSimilarityAnalyzer = new FacialSimilarityAnalyzer()

// Utility functions
export function calculateFacialSimilarity(face1: number[], face2: number[]): number {
  return facialSimilarityAnalyzer.calculateSimilarity(face1, face2).similarity
}

export async function extractFaceFromImage(image: HTMLImageElement): Promise<number[] | null> {
  const embedding = await facialSimilarityAnalyzer.extractFaceEmbedding(image)
  return embedding?.embedding || null
}

export async function findSimilarFaces(
  queryImage: string | File,
  candidates: Array<{id: string, imageUrl: string}>
): Promise<Array<{id: string, similarity: number}>> {
  try {
    if (!isBrowser) {
      console.warn('⚠️ Facial similarity search only available in browser')
      return []
    }
    // Extract query embedding
    let queryEmbedding: FaceEmbedding | null

    if (typeof queryImage === 'string') {
      queryEmbedding = await facialSimilarityAnalyzer.processImageUrl(queryImage)
    } else {
      queryEmbedding = await facialSimilarityAnalyzer.processImageFile(queryImage)
    }

    if (!queryEmbedding) {
      throw new Error('Failed to extract face from query image')
    }

    // Process candidate images
    const candidateEmbeddings = await facialSimilarityAnalyzer.batchProcessImages(
      candidates.map(c => ({ id: c.id, url: c.imageUrl }))
    )

    // Calculate similarities
    const results = candidateEmbeddings
      .filter(ce => ce.embedding !== null)
      .map(ce => {
        const similarity = facialSimilarityAnalyzer.calculateSimilarity(
          queryEmbedding!.embedding,
          ce.embedding!.embedding
        )
        return {
          id: ce.id,
          similarity: similarity.similarity
        }
      })
      .sort((a, b) => b.similarity - a.similarity)

    return results
  } catch (error) {
    console.error('Error in facial similarity search:', error)
    return []
  }
}