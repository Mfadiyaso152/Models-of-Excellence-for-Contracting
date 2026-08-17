/**
 * Universal Mobile-Friendly File Downloader
 * Supports Base64 data URLs, Blobs, and standard HTTP/HTTPS URLs.
 * Handles iOS Safari, Android Chrome, and Desktop browsers seamlessly.
 */

export function downloadFile(url: string, fileName: string = 'document.pdf') {
  if (!url) {
    alert('رابط الملف غير متوفر للتحميل.');
    return;
  }

  try {
    // If it's a data URL (e.g. data:application/pdf;base64,...)
    if (url.startsWith('data:')) {
      const parts = url.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 5000);
      return;
    }

    // Standard HTTP / HTTPS URL
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Download error:', err);
    // Fallback: Open in new window/tab
    window.open(url, '_blank');
  }
}
