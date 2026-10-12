/** What the server hands back so the browser can upload one photo straight to Cloudinary. */
export interface PhotoUploadSignature {
    cloud_name: string;
    api_key: string;
    folder: string;
    timestamp: number;
    signature: string;
}

/** Where an upload stands: `progress` runs 0 to 100 while the file travels. */
export type PhotoUpload = { state: 'uploading'; progress: number } | { state: 'done'; url: string };
