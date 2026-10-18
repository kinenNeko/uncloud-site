// Cloudflare Pages Function: 图片上传到 R2
export async function onRequestPost({ request, env }) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  try {
    const form = await request.formData();
    const file = form.get('image') || form.get('file');
    if (!file || typeof file === 'string') {
      return new Response(JSON.stringify({ success: false, message: 'no file' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...cors },
      });
    }
    const buf = await file.arrayBuffer();
    if (buf.byteLength > 8 * 1024 * 1024) {
      return new Response(JSON.stringify({ success: false, message: 'too large (max 8MB)' }), {
        status: 413, headers: { 'Content-Type': 'application/json', ...cors },
      });
    }
    const type = file.type || 'image/png';
    if (!type.startsWith('image/')) {
      return new Response(JSON.stringify({ success: false, message: 'not an image' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...cors },
      });
    }
    const ext = (type.split('/')[1] || 'png').replace('jpeg', 'jpg');
    const name = 'img/' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + '.' + ext;
    await env.IMG_BUCKET.put(name, buf, { httpMetadata: { contentType: type } });
    const url = 'https://img.uncloud.top/' + name;
    return new Response(JSON.stringify({ success: true, url, data: { url } }), {
      status: 200, headers: { 'Content-Type': 'application/json', ...cors },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, message: String(e) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...cors },
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
