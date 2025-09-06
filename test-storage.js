// Simple test script to verify Supabase storage integration
// Run with: node test-storage.js

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testStorageIntegration() {
  console.log('🧪 Testing Supabase Storage Integration...\n')

  try {
    // Test 1: Check authentication
    console.log('1. Testing authentication...')
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) {
      console.log('   ⚠️  No authenticated user (this is expected for anonymous access)')
    } else if (user) {
      console.log(`   ✅ User authenticated: ${user.email || user.id}`)
    } else {
      console.log('   ℹ️  No user session (anonymous mode)')
    }

    // Test 2: Check storage bucket access
    console.log('\n2. Testing storage bucket access...')
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      console.log(`   ❌ Error listing buckets: ${bucketsError.message}`)
    } else {
      const userFilesBucket = buckets.find(bucket => bucket.id === 'user-files')
      if (userFilesBucket) {
        console.log('   ✅ user-files bucket found')
      } else {
        console.log('   ⚠️  user-files bucket not found. Please create it in your Supabase dashboard.')
      }
    }

    // Test 3: Test file listing (this will work for anonymous users too)
    console.log('\n3. Testing file listing...')
    const { data: files, error: filesError } = await supabase.storage
      .from('user-files')
      .list('', { limit: 10 })
    
    if (filesError) {
      console.log(`   ❌ Error listing files: ${filesError.message}`)
    } else {
      console.log(`   ✅ Successfully listed files. Found ${files.length} items.`)
      if (files.length > 0) {
        console.log('   📁 Files/folders found:')
        files.forEach(file => {
          console.log(`      - ${file.name} (${file.metadata ? 'file' : 'folder'})`)
        })
      }
    }

    // Test 4: Test signed URL generation (if user is authenticated)
    if (user) {
      console.log('\n4. Testing signed URL generation...')
      const testPath = `${user.id}/test-file.pdf`
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('user-files')
        .createSignedUrl(testPath, 3600)
      
      if (signedUrlError) {
        console.log(`   ⚠️  Signed URL generation failed (expected if file doesn't exist): ${signedUrlError.message}`)
      } else {
        console.log('   ✅ Signed URL generation successful')
      }
    } else {
      console.log('\n4. Skipping signed URL test (no authenticated user)')
    }

    console.log('\n🎉 Storage integration test completed!')
    console.log('\n📋 Next steps:')
    console.log('   1. Make sure the user-files bucket exists in your Supabase dashboard')
    console.log('   2. Run the RLS policies SQL in your Supabase SQL editor')
    console.log('   3. Start the development server: npm run dev')
    console.log('   4. Test file upload and viewing in the application')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testStorageIntegration()
