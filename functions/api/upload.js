// 图片上传：转发 Picui 免费图床
export async function onRequestPost(context) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  const j = (o, s) => new Response(JSON.stringify(o), {
    status: s || 200,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
  let step = 'start';
  try {
    const req = context.request;
    step = 'readForm';
    const form = await req.formData();
    const file = form.get('image') || form.get('file');
    if (!file || typeof file === 'string') return j({ success: false, message: 'no file' }, 400);
    step = 'arrayBuffer';
    const buf = await file.arrayBuffer();
    const type = file.type || 'image/png';
    if (!type.startsWith('image/')) return j({ success: false, message: 'not an image' }, 400);
    if (buf.byteLength > 8388608) return j({ success: false, message: 'too large' }, 413);

    step = 'buildForm';
    const fd = new FormData();
    const ext = type.split('/')[1] ? type.split('/')[1].replace('jpeg', 'jpg') : 'png';
    const name = 'cat_' + Date.now().toString(36) + '.' + ext;
    fd.append('file', new Blob([buf], { type }), name);

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
      return j({ success: true, url: rj.data.links.url, data: { url: rj.data.links.url } });
    }
    return j({ success: false, step, upstream: text.slice(0, 300) }, 502);
  } catch (e) {
    return j({ success: false, step, error: String(e && e.stack ? e.stack : e) }, 500);
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
