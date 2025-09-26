/**
 * Browser-only Facial Similarity Module
 * This module ensures TensorFlow.js only loads in browser environment
 */

// Type definitions for browser-only usage
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

let tf: any = null
let isInitialized = false

// Lazy load TensorFlow.js only in browser
const loadTensorFlow = async () => {
  if (typeof window === 'undefined') {
    throw new Error('TensorFlow.js requires browser environment')
  }
  
  if (!tf) {
    tf = await import('@tensorflow/tfjs')
    await tf.ready()
  }
  
  return tf
}

export class BrowserFacialSimilarityAnalyzer {
  private readonly threshold = 0.6

  async initialize(): Promise<void> {
    if (isInitialized) return
    
    if (typeof window === 'undefined') {
      throw new Error('Facial recognition is only available in browser environment')
    }

    try {
      await loadTensorFlow()
      isInitialized = true
      console.log('✅ Browser facial recognition initialized')
    } catch (error) {
      console.error('❌ Failed to initialize facial recognition:', error)
      throw error
    }
  }

  async extractFaceEmbedding(imageElement: HTMLImageElement | HTMLCanvasElement): Promise<FaceEmbedding | null> {
    try {
      if (typeof window === 'undefined') {
        console.warn('⚠️ Face embedding extraction only available in browser')
        return null
      }

      if (!isInitialized) {
        await this.initialize()
      }

      if (!tf) {
        await loadTensorFlow()
      }

      // Convert image to tensor
      const tensor = tf.browser.fromPixels(imageElement)
      const resized = tf.image.resizeBilinear(tensor, [160, 160])
      const normalized = resized.div(255.0)
      
      // Simple feature extraction
      const features = await this.extractSimpleFeatures(normalized)
      
      // Clean up tensors
      tensor.dispose()
      resized.dispose()
      normalized.dispose()

      if (features) {
        return {
          embedding: features,
          confidence: 0.8,
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

  private async extractSimpleFeatures(imageTensor: any): Promise<number[] | null> {
    try {
      // Convert to grayscale
      const grayscale = tf.image.rgbToGrayscale(imageTensor as any)
      
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

      const grayscale4d = grayscale.expandDims(0)
      const edgesX = tf.conv2d(grayscale4d as any, sobelX as any, 1, 'same')
      const edgesY = tf.conv2d(grayscale4d as any, sobelY as any, 1, 'same')
      
      // Combine edges
      const edges = tf.sqrt(tf.add(tf.square(edgesX), tf.square(edgesY)))
      
      // Pool features from different regions
      const pooled = tf.avgPool(edges as any, 8, 8, 'valid')
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

      return Array.from(features as number[]).slice(0, 128)
    } catch (error) {
      console.error('Error in feature extraction:', error)
      return null
    }
  }

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
    const normalizedSimilarity = (similarity + 1) / 2
    
    return {
      similarity: normalizedSimilarity,
      confidence: 0.7,
      match: normalizedSimilarity >= this.threshold,
      threshold: this.threshold
    }
  }

  async processImageFile(file: File): Promise<FaceEmbedding | null> {
    if (typeof window === 'undefined') {
      console.warn('⚠️ Image processing only available in browser')
      return null
    }

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

  async processImageUrl(url: string): Promise<FaceEmbedding | null> {
    if (typeof window === 'undefined') {
      console.warn('⚠️ Image processing only available in browser')
      return null
    }

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

  async batchProcessImages(
    images: Array<{id: string, url: string}>
  ): Promise<Array<{id: string, embedding: FaceEmbedding | null}>> {
    if (typeof window === 'undefined') {
      console.warn('⚠️ Batch processing only available in browser')
      return images.map(img => ({ id: img.id, embedding: null }))
    }

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
}

// Create singleton instance that only initializes in browser
let browserAnalyzer: BrowserFacialSimilarityAnalyzer | null = null

export function getBrowserFacialAnalyzer(): BrowserFacialSimilarityAnalyzer | null {
  if (typeof window === 'undefined') {
    return null
  }
  
  if (!browserAnalyzer) {
    browserAnalyzer = new BrowserFacialSimilarityAnalyzer()
  }
  
  return browserAnalyzer
}

// Browser-only utility functions
export async function findSimilarFaces(
  queryImage: string | File,
  candidates: Array<{id: string, imageUrl: string}>
): Promise<Array<{id: string, similarity: number}>> {
  try {
    if (typeof window === 'undefined') {
      console.warn('⚠️ Facial similarity search only available in browser')
      return []
    }

    const analyzer = getBrowserFacialAnalyzer()
    if (!analyzer) {
      return []
    }

    // Extract query embedding
    let queryEmbedding: FaceEmbedding | null

    if (typeof queryImage === 'string') {
      queryEmbedding = await analyzer.processImageUrl(queryImage)
    } else {
      queryEmbedding = await analyzer.processImageFile(queryImage)
    }

    if (!queryEmbedding) {
      throw new Error('Failed to extract face from query image')
    }

    // Process candidate images
    const candidateEmbeddings = await analyzer.batchProcessImages(
      candidates.map(c => ({ id: c.id, url: c.imageUrl }))
    )

    // Calculate similarities
    const results = candidateEmbeddings
      .filter(ce => ce.embedding !== null)
      .map(ce => {
        const similarity = analyzer.calculateSimilarity(
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