const json=(d,s=200)=>Response.json(d,{status:s,headers:{"Cache-Control":"no-store"}});
const allowed=new Set(["image/jpeg","image/png","image/webp","image/avif"]);
const ext={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/avif":"avif"};
export async function onRequestPost({request,env}) {
  try {
    const fd=await request.formData(), file=fd.get("file");
    if(!(file instanceof File))return json({success:false,message:"اختر صورة."},400);
    if(!allowed.has(file.type))return json({success:false,message:"الصيغة غير مدعومة."},400);
    if(file.size>5*1024*1024)return json({success:false,message:"الصورة أكبر من 5MB."},400);
    const key=`products/${Date.now()}-${crypto.randomUUID()}.${ext[file.type]}`;
    await env.MEDIA.put(key,file.stream(),{httpMetadata:{contentType:file.type,cacheControl:"public,max-age=31536000,immutable"}});
    return json({success:true,key,url:`/media/${key}`},201);
  } catch(e){console.error(e);return json({success:false,message:"تعذر رفع الصورة."},500);}
}
