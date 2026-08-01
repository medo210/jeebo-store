function p(v,f){try{return JSON.parse(v||"")??f}catch{return f}}
export async function onRequestGet({env}){
 try{
  const s=await env.jeebo_db.prepare(`SELECT store_name,whatsapp,shipping_note,shipping_mode,flat_shipping,governorate_rates,enabled_governorates,meta_pixel,tiktok_pixel,google_analytics FROM settings WHERE id=1`).first();
  return Response.json({success:true,settings:{storeName:s?.store_name||"Jeebo",whatsapp:s?.whatsapp||"",shippingNote:s?.shipping_note||"",shippingMode:s?.shipping_mode||"flat",flatShipping:Number(s?.flat_shipping||0),governorateRates:p(s?.governorate_rates,{}),enabledGovernorates:p(s?.enabled_governorates,[]),metaPixel:s?.meta_pixel||"",tiktokPixel:s?.tiktok_pixel||"",googleAnalytics:s?.google_analytics||""}},{headers:{"Cache-Control":"public,max-age=60"}})
 }catch(e){console.error(e);return Response.json({success:false,message:"تعذر تحميل الإعدادات."},{status:500})}
}