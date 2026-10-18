// 图片上传：转发 Picui 免费图床（JSON base64 方式，避开 multipart 限制）
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const json = (o, s) => new Response(JSON.stringify(o), {
  status: s || 200,
  headers: { 'Content-Type': 'application/json', ...CORS },
});

export async function onRequestPost(context) {
  let step = 'start';
  try {
    const req = context.request;

    step = 'readBody';
    const body = await req.json();
    const dataUrl = body.data || body.image || '';
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      return json({ success: false, message: 'expect data:image/...' }, 400);
    }

    step = 'parseDataUrl';
    const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!m) return json({ success: false, message: 'bad data url' }, 400);
    const type = m[1];
    const bin = Uint8Array.from(atob(m[2]), c => c.charCodeAt(0));
    if (bin.byteLength > 8388608) return json({ success: false, message: 'too large' }, 413);

    step = 'buildForm';
    const ext = type.split('/')[1].replace('jpeg', 'jpg');
    const name = 'cat_' + Date.now().toString(36) + '.' + ext;
    const fd = new FormData();
    fd.append('file', new Blob([bin], { type }), name);

    step = 'fetchPicui';
    const res = await fetch('https://picui.cn/api/v1/upload', {
      method: 'POST',
      body: fd,
      headers: { 'Referer': 'https://picui.cn/' },
    });

    step = 'readResp';
    const text = await res.text();
    let rj = null;
    try { rj = JSON.parse(text); } catch (e) {}
    if (rj && rj.status && rj.data && rj.data.links && rj.data.links.url) {
      return json({ success: true, url: rj.data.links.url, data: { url: rj.data.links.url } });
    }
    return json({ success: false, step, upstream: text.slice(0, 300) }, 502);
  } catch (e) {
    return json({ success: false, step, error: String(e && e.stack ? e.stack : e) }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Max-Age': '86400' } });
}
