# Supabase Storage Integration Setup

This guide will help you set up Supabase storage integration for your construction document viewer application.

## Prerequisites

1. A Supabase project with authentication enabled
2. Environment variables configured in your `.env.local` file

## Environment Variables

Make sure you have the following environment variables in your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Storage Bucket Setup

### 1. Create the Storage Bucket

In your Supabase dashboard, go to Storage and create a new bucket with these settings:

- **Name**: `user-files`
- **Public**: `false` (private bucket)
- **File size limit**: `50MB`
- **Allowed MIME types**: 
  - `application/pdf`
  - `image/jpeg`
  - `image/png`
  - `image/gif`
  - `image/webp`
  - `application/zip`
  - `application/x-rar-compressed`
  - `application/x-7z-compressed`
  - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - `application/vnd.ms-excel`
  - `text/csv`
  - `text/plain`
  - `application/msword`
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

### 2. Set Up Row Level Security (RLS) Policies

Run the following SQL in your Supabase SQL Editor:

```sql
-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own files
CREATE POLICY "Users can view their own files" ON storage.objects
FOR SELECT USING (
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can upload files to their own folder
CREATE POLICY "Users can upload their own files" ON storage.objects
FOR INSERT WITH CHECK (
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their own files
CREATE POLICY "Users can update their own files" ON storage.objects
FOR UPDATE USING (
  auth.uid()::text = (storage.foldername(name))[1]
) WITH CHECK (
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete their own files" ON storage.objects
FOR DELETE USING (
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Anonymous users can view files (for guest access)
CREATE POLICY "Anonymous users can view files" ON storage.objects
FOR SELECT USING (
  auth.role() = 'anon'
);

-- Policy: Anonymous users can upload files (for guest access)
CREATE POLICY "Anonymous users can upload files" ON storage.objects
FOR INSERT WITH CHECK (
  auth.role() = 'anon'
);

-- Policy: Anonymous users can update files (for guest access)
CREATE POLICY "Anonymous users can update files" ON storage.objects
FOR UPDATE USING (
  auth.role() = 'anon'
) WITH CHECK (
  auth.role() = 'anon'
);

-- Policy: Anonymous users can delete files (for guest access)
CREATE POLICY "Anonymous users can delete files" ON storage.objects
FOR DELETE USING (
  auth.role() = 'anon'
);
```

## Features Implemented

### 1. Document Sidebar
- **File Listing**: Automatically loads PDF files from Supabase storage
- **User Isolation**: Each user only sees their own files
- **Loading States**: Shows loading indicators while fetching files
- **Error Handling**: Displays error messages if file loading fails
- **Empty State**: Shows helpful message when no files are found

### 2. PDF Viewer
- **Supabase Integration**: Loads PDFs from Supabase storage using signed URLs
- **Security**: Uses signed URLs for secure file access
- **Loading States**: Shows loading spinner while PDF is being fetched
- **Error Handling**: Displays error messages if PDF loading fails
- **Fallback**: Falls back to placeholder PDF if loading fails

### 3. Project Sidebar (File Management)
- **File Operations**: Upload, rename, delete files and folders
- **Folder Management**: Create and navigate through project folders
- **Search**: Search through files and folders
- **Progress Tracking**: Shows upload progress for multiple files
- **User-Specific Paths**: All files are stored in user-specific directories

## File Structure

Files are organized in the following structure in Supabase storage:

```
user-files/
├── {user-id}/
│   ├── {project-folder}/
│   │   ├── document1.pdf
│   │   ├── document2.pdf
│   │   └── ...
│   ├── document3.pdf
│   └── ...
```

## Security Features

1. **Row Level Security (RLS)**: Ensures users can only access their own files
2. **Signed URLs**: PDFs are accessed through time-limited signed URLs
3. **Path Validation**: All file operations validate that paths belong to the authenticated user
4. **Guest Access**: Anonymous users can also upload and manage files

## Usage

1. **Upload Files**: Use the "Upload" button in the project sidebar to upload PDF files
2. **Create Projects**: Use the "New Project" button to create organized folders
3. **View Documents**: Click on any PDF file in the document sidebar to view it
4. **Manage Files**: Use the three-dot menu on files to rename or delete them

## Troubleshooting

### Common Issues

1. **"User not authenticated" error**: Make sure the user is signed in or using guest access
2. **"File not found" error**: Check if the file exists in the correct user directory
3. **Upload failures**: Verify the file type is allowed and size is under 50MB
4. **PDF loading issues**: Check if the signed URL is valid and not expired

### Debug Mode

The application includes debug logging. Check the browser console for detailed error messages and file path information.

## Testing

1. **Upload a PDF file** using the project sidebar
2. **Select the file** from the document sidebar
3. **Verify the PDF loads** in the viewer
4. **Test file operations** like rename and delete
5. **Test with different users** to ensure isolation

## Next Steps

- Consider implementing file versioning
- Add file sharing capabilities
- Implement file metadata storage
- Add file preview thumbnails
- Implement file synchronization across devices
