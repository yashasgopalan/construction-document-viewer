import { supabase, getCurrentUser } from './supabase-client'

export interface FileUploadResult {
  path: string
  url: string
  signedUrl?: string
  error?: string
}

export interface SignedUrlResult {
  signedUrl: string
  expiresAt: Date
  error?: string
}

export interface FileItem {
  name: string
  path: string
  url: string
  signedUrl?: string
  isFolder: boolean
  size?: number
  created_at?: string
  updated_at?: string
}

/**
 * Generate a signed URL for secure file access
 * @param bucket - Storage bucket name
 * @param path - File path within the bucket
 * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @returns Promise<SignedUrlResult>
 */
export async function generateSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<SignedUrlResult> {
  try {
    console.log('generateSignedUrl: Attempting to generate signed URL for:', { bucket, path, expiresIn })
    
    // Get current user to verify authentication
    const user = await getCurrentUser()
    console.log('generateSignedUrl: Current user:', user?.id)
    console.log('generateSignedUrl: User details:', { 
      id: user?.id, 
      email: user?.email, 
      isAnonymous: user?.is_anonymous 
    })
    
    if (!user) {
      return {
        signedUrl: '',
        expiresAt: new Date(),
        error: 'User not authenticated'
      }
    }

    // Verify the path starts with the user ID
    const pathParts = path.split('/')
    console.log('generateSignedUrl: Path analysis:', { 
      fullPath: path, 
      pathParts, 
      firstPart: pathParts[0], 
      userId: user.id,
      match: pathParts[0] === user.id 
    })
    
    if (pathParts[0] !== user.id) {
      console.error('generateSignedUrl: Path does not match user ID:', { 
        path, 
        userId: user.id,
        pathUserId: pathParts[0],
        allPathParts: pathParts
      })
      return {
        signedUrl: '',
        expiresAt: new Date(),
        error: `File path does not match authenticated user. Expected: ${user.id}, Found: ${pathParts[0]}`
      }
    }
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)

    console.log('generateSignedUrl: Supabase response:', { data, error })

    if (error) {
      console.error('generateSignedUrl: Supabase error:', error)
      
      // If it's a 404 error, let's try to list the file to see if it exists
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        console.log('generateSignedUrl: File not found, checking if file exists...')
        const { data: listData, error: listError } = await supabase.storage
          .from(bucket)
          .list(pathParts.slice(0, -1).join('/'))
        
        console.log('generateSignedUrl: Directory listing:', { listData, listError })
        
        if (listData) {
          const fileName = pathParts[pathParts.length - 1]
          const fileExists = listData.some(item => item.name === fileName)
          console.log('generateSignedUrl: File exists in directory:', fileExists)
        }
      }
      
      return {
        signedUrl: '',
        expiresAt: new Date(),
        error: `Supabase error: ${error.message}`
      }
    }

    if (!data?.signedUrl) {
      console.error('generateSignedUrl: No signed URL in response:', data)
      return {
        signedUrl: '',
        expiresAt: new Date(),
        error: 'Failed to generate signed URL - no URL returned from Supabase'
      }
    }

    const expiresAt = new Date(Date.now() + expiresIn * 1000)
    console.log('generateSignedUrl: Successfully generated signed URL, expires at:', expiresAt)

    return {
      signedUrl: data.signedUrl,
      expiresAt
    }
  } catch (err) {
    console.error('generateSignedUrl: Exception:', err)
    return {
      signedUrl: '',
      expiresAt: new Date(),
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    }
  }
}

/**
 * Get the current authenticated user ID
 * @returns Promise<string | null>
 */
async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser()
  return user?.id || null
}

/**
 * Verify if a file exists in storage
 * @param bucket - Storage bucket name
 * @param path - File path within the bucket
 * @returns Promise<boolean>
 */
export async function verifyFileExists(bucket: string, path: string): Promise<boolean> {
  try {
    const pathParts = path.split('/')
    const directory = pathParts.slice(0, -1).join('/')
    const fileName = pathParts[pathParts.length - 1]
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(directory)
    
    if (error) {
      console.error('verifyFileExists: Error listing directory:', error)
      return false
    }
    
    return data?.some(item => item.name === fileName) || false
  } catch (err) {
    console.error('verifyFileExists: Exception:', err)
    return false
  }
}

/**
 * Get detailed file information for debugging
 * @param bucket - Storage bucket name
 * @param path - File path within the bucket
 * @returns Promise<{exists: boolean, details?: any}>
 */
export async function getFileInfo(bucket: string, path: string): Promise<{exists: boolean, details?: any}> {
  try {
    const pathParts = path.split('/')
    const directory = pathParts.slice(0, -1).join('/')
    const fileName = pathParts[pathParts.length - 1]
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(directory)
    
    if (error) {
      return { exists: false, details: { error } }
    }
    
    const file = data?.find(item => item.name === fileName)
    return { 
      exists: !!file, 
      details: file ? { ...file, directory, fileName } : { directory, fileName, availableFiles: data?.map(f => f.name) }
    }
  } catch (err) {
    return { exists: false, details: { error: err } }
  }
}

/**
 * Debug user session and authentication status
 * @returns Promise<{user: any, session: any, authStatus: string}>
 */
export async function debugUserSession(): Promise<{user: any, session: any, authStatus: string}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    console.log('Debug User Session:', {
      user: user ? { id: user.id, email: user.email, is_anonymous: user.is_anonymous } : null,
      session: session ? { access_token: session.access_token?.substring(0, 20) + '...', expires_at: session.expires_at } : null,
      userError,
      sessionError
    })
    
    let authStatus = 'Unknown'
    if (user && session) {
      authStatus = user.is_anonymous ? 'Anonymous User' : 'Authenticated User'
    } else if (user && !session) {
      authStatus = 'User exists but no session'
    } else if (!user && session) {
      authStatus = 'Session exists but no user'
    } else {
      authStatus = 'No user or session'
    }
    
    return { user, session, authStatus }
  } catch (err) {
    console.error('Debug User Session Error:', err)
    return { user: null, session: null, authStatus: 'Error checking auth' }
  }
}

/**
 * Refresh user session
 * @returns Promise<boolean>
 */
export async function refreshUserSession(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.refreshSession()
    if (error) {
      console.error('Refresh session error:', error)
      return false
    }
    console.log('Session refreshed successfully:', data)
    return true
  } catch (err) {
    console.error('Refresh session exception:', err)
    return false
  }
}

/**
 * Generate user-specific file path
 * @param userId - User ID
 * @param folderPath - Optional folder path
 * @param fileName - File name
 * @returns string
 */
export function generateUserFilePath(userId: string, folderPath: string = '', fileName: string): string {
  if (folderPath) {
    return `${userId}/${folderPath}/${fileName}`
  }
  return `${userId}/${fileName}`
}

/**
 * Upload a file to Supabase Storage with user-specific path
 * @param fileName - Name of the file
 * @param file - File to upload
 * @param folderPath - Optional folder path within user directory
 * @param generateSigned - Whether to generate a signed URL (default: true)
 * @returns Promise<FileUploadResult>
 */
export async function uploadUserFile(
  fileName: string,
  file: File,
  folderPath: string = '',
  generateSigned: boolean = true
): Promise<FileUploadResult> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return {
        path: '',
        url: '',
        error: 'User not authenticated'
      }
    }

    const fullPath = generateUserFilePath(userId, folderPath, fileName)

    // Upload the file
    const { data, error } = await supabase.storage
      .from('user-files')
      .upload(fullPath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      return {
        path: '',
        url: '',
        error: error.message
      }
    }

    if (!data?.path) {
      return {
        path: '',
        url: '',
        error: 'Upload failed - no path returned'
      }
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('user-files')
      .getPublicUrl(data.path)

    const result: FileUploadResult = {
      path: data.path,
      url: urlData.publicUrl
    }

    // Generate signed URL if requested
    if (generateSigned) {
      const signedUrlResult = await generateSignedUrl('user-files', data.path)
      if (!signedUrlResult.error) {
        result.signedUrl = signedUrlResult.signedUrl
      }
    }

    return result
  } catch (err) {
    return {
      path: '',
      url: '',
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    }
  }
}

/**
 * List user files and folders with optional signed URLs
 * @param folderPath - Optional folder path within user directory
 * @param generateSigned - Whether to generate signed URLs for files (default: false)
 * @returns Promise<FileItem[]>
 */
export async function listUserFiles(
  folderPath: string = '',
  generateSigned: boolean = false
): Promise<FileItem[]> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      throw new Error('User not authenticated')
    }

    const fullPath = folderPath ? `${userId}/${folderPath}` : userId

    const { data, error } = await supabase.storage
      .from('user-files')
      .list(fullPath)

    if (error) {
      throw error
    }

    const files: FileItem[] = []

    // Process folders first
    const folders = data?.filter(item => item.metadata === null) || []
    for (const folder of folders) {
      files.push({
        name: folder.name,
        path: `${fullPath}/${folder.name}`,
        url: '',
        isFolder: true,
        created_at: folder.created_at,
        updated_at: folder.updated_at
      })
    }

    // Process files
    const fileItems = data?.filter(item => item.metadata !== null) || []
    for (const file of fileItems) {
      const filePath = `${fullPath}/${file.name}`
      const fileItem: FileItem = {
        name: file.name,
        path: filePath,
        url: supabase.storage.from('user-files').getPublicUrl(filePath).data.publicUrl,
        isFolder: false,
        size: file.metadata?.size,
        created_at: file.created_at,
        updated_at: file.updated_at
      }

      // Generate signed URL if requested
      if (generateSigned) {
        const signedUrlResult = await generateSignedUrl('user-files', filePath)
        if (!signedUrlResult.error) {
          fileItem.signedUrl = signedUrlResult.signedUrl
        }
      }

      files.push(fileItem)
    }

    return files
  } catch (err) {
    console.error('List user files error:', err)
    throw err
  }
}

/**
 * Create a new folder within user directory
 * @param folderName - Name of the new folder
 * @param parentPath - Optional parent folder path
 * @returns Promise<{success: boolean, error?: string}>
 */
export async function createUserFolder(
  folderName: string,
  parentPath: string = ''
): Promise<{success: boolean, error?: string}> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return {
        success: false,
        error: 'User not authenticated'
      }
    }

    const fullPath = parentPath ? `${userId}/${parentPath}/${folderName}` : `${userId}/${folderName}`

    // Create folder by uploading a placeholder file
    // This is the standard way to create folders in Supabase Storage
    const placeholderContent = `# ${folderName}\nThis is a folder placeholder.`
    const { error } = await supabase.storage
      .from('user-files')
      .upload(`${fullPath}/.folder`, new Blob([placeholderContent], { type: 'text/plain' }), {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Folder creation error:', error)
      return {
        success: false,
        error: error.message
      }
    }

    return { success: true }
  } catch (err) {
    console.error('Folder creation error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    }
  }
}

/**
 * Delete a file or folder from user storage
 * @param path - File or folder path within user directory
 * @returns Promise<{success: boolean, error?: string}>
 */
export async function deleteUserFile(path: string): Promise<{success: boolean, error?: string}> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return {
        success: false,
        error: 'User not authenticated'
      }
    }

    // Ensure the path starts with user ID for security
    if (!path.startsWith(userId)) {
      return {
        success: false,
        error: 'Invalid path - must be within user directory'
      }
    }

    const { error } = await supabase.storage
      .from('user-files')
      .remove([path])

    if (error) {
      return {
        success: false,
        error: error.message
      }
    }

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    }
  }
}

/**
 * Download a file using a signed URL
 * @param signedUrl - The signed URL to download from
 * @param filename - Optional filename for the download
 */
export async function downloadFile(signedUrl: string, filename?: string): Promise<void> {
  try {
    const response = await fetch(signedUrl)
    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`)
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || 'download'
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  } catch (err) {
    console.error('Download error:', err)
    throw err
  }
}

/**
 * Legacy functions for backward compatibility
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File,
  generateSigned: boolean = true
): Promise<FileUploadResult> {
  try {
    // Upload the file
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      return {
        path: '',
        url: '',
        error: error.message
      }
    }

    if (!data?.path) {
      return {
        path: '',
        url: '',
        error: 'Upload failed - no path returned'
      }
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path)

    const result: FileUploadResult = {
      path: data.path,
      url: urlData.publicUrl
    }

    // Generate signed URL if requested
    if (generateSigned) {
      const signedUrlResult = await generateSignedUrl(bucket, data.path)
      if (!signedUrlResult.error) {
        result.signedUrl = signedUrlResult.signedUrl
      }
    }

    return result
  } catch (err) {
    return {
      path: '',
      url: '',
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    }
  }
}

export async function listFiles(
  bucket: string,
  folder: string = '',
  generateSigned: boolean = false
) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder)

    if (error) {
      throw error
    }

    const files = data?.map(file => ({
      name: file.name,
      url: supabase.storage.from(bucket).getPublicUrl(`${folder}/${file.name}`).data.publicUrl,
      signedUrl: undefined as string | undefined
    })) || []

    // Generate signed URLs if requested
    if (generateSigned) {
      for (const file of files) {
        const signedUrlResult = await generateSignedUrl(bucket, `${folder}/${file.name}`)
        if (!signedUrlResult.error) {
          file.signedUrl = signedUrlResult.signedUrl
        }
      }
    }

    return files
  } catch (err) {
    console.error('List files error:', err)
    throw err
  }
}

export async function deleteFile(bucket: string, path: string): Promise<{success: boolean, error?: string}> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])

    if (error) {
      return {
        success: false,
        error: error.message
      }
    }

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    }
  }
}
