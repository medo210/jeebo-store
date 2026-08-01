export async function onRequestGet({env,params}) {
  const key=(Array.isArray(params.path)?params.path:[params.path]).filter(Boolean).join("/");
  if(!key)return new Response("Not found",{status:404});
  const obj=await env.MEDIA.get(key);
  if(!obj)return new Response("Not found",{status:404});
  const h=new Headers();obj.writeHttpMetadata(h);h.set("etag",obj.httpEtag);
  h.set("Cache-Control","public,max-age=31536000,immutable");
  return new Response(obj.body,{headers:h});
}
