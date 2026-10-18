// Cloudflare Pages Function: 图片上传（转发到 Picui 免费图床，免注册免绑卡）
export async function onRequestPost({ request }) {
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

    const fd = new FormData();
    const name = 'cat_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + (type.split('/')[1] ? '.' + type.split('/')[1].replace('jpeg', 'jpg') : '.png');
    fd.append('file', new File([buf], name, { type }));

    const res = await fetch('https://picui.cn/api/v1/upload', {
      method: 'POST',
      body: fd,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
        'Referer': 'https://picui.cn/',
      },
    });
    const text = await res.text();
    let j = null;
    try { j = JSON.parse(text); } catch (e) {}
    if (j && j.status && j.data && j.data.links && j.data.links.url) {
      const url = j.data.links.url;
      return new Response(JSON.stringify({ success: true, url, data: { url } }), {
        status: 200, headers: { 'Content-Type': 'application/json', ...cors },
      });
    }
    return new Response(JSON.stringify({ success: false, message: 'upstream failed', raw: text.slice(0, 300) }), {
      status: 502, headers: { 'Content-Type': 'application/json', ...cors },
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
