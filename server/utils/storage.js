const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  console.warn('Supabase credentials missing. Supabase Storage will be disabled.');
}

const BUCKET_NAME = 'mahim-uploads';

/**
 * Uploads a file buffer to Supabase Storage.
 * @param {string} fileName - Destination file name in bucket
 * @param {Buffer} buffer - File buffer
 * @param {string} mimetype - Content type of file
 * @returns {Promise<string>} Public URL of the uploaded file
 */
async function uploadFile(fileName, buffer, mimetype) {
  if (!supabase) {
    throw new Error('Supabase Storage client is not initialized.');
  }

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, buffer, {
      contentType: mimetype,
      upsert: true
    });

  if (error) {
    throw error;
  }

  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}

/**
 * Downloads a file from Supabase Storage.
 * @param {string} fileName - Name of the file to download
 * @returns {Promise<any>} Response download data
 */
async function downloadFile(fileName) {
  if (!supabase) {
    throw new Error('Supabase Storage client is not initialized.');
  }

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(fileName);

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Deletes a file from Supabase Storage.
 * @param {string} fileName - File to delete
 */
async function deleteFile(fileName) {
  if (!supabase) {
    throw new Error('Supabase Storage client is not initialized.');
  }

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([fileName]);

  if (error) {
    throw error;
  }
}

module.exports = {
  supabase,
  uploadFile,
  downloadFile,
  deleteFile
};
