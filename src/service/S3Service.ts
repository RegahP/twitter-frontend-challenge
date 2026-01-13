import axios from "axios";

export const S3Service = {
  upload: async (file: File, url: string) => {
    const normalizedUrl = String(url).trim();
    if (!normalizedUrl || normalizedUrl.includes("undefined") || /\s/.test(normalizedUrl)) {
      throw new Error(`Invalid presigned upload URL: "${normalizedUrl}"`);
    }

    try {
      // For presigned PUT URLs, send raw bytes and match the signed Content-Type (if provided).
      const headers: Record<string, string> = {};
      if (file.type) headers["Content-Type"] = file.type;

      await axios.put(normalizedUrl, file, { headers });
    } catch (err) {
      throw new Error(
        `S3 upload failed. If this happens in the browser, verify bucket CORS allows PUT from your origin. Root error: ${String(
          err
        )}`
      );
    }
  },

  deleteByUrl: async (url: string) => {
    const normalizedUrl = String(url).trim();
    if (!normalizedUrl || normalizedUrl.includes("undefined") || /\s/.test(normalizedUrl)) {
      throw new Error(`Invalid presigned delete URL: "${normalizedUrl}"`);
    }

    try {
      await axios.delete(normalizedUrl);
    } catch (err) {
      throw new Error(`S3 delete failed: ${String(err)}`);
    }
  },
};
