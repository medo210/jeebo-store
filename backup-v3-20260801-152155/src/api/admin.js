async function request(url,options={}) {
  const response=await fetch(url,{headers:{Accept:"application/json",...(options.body&&!(options.body instanceof FormData)?{"Content-Type":"application/json"}:{}),...options.headers},...options});
  const data=await response.json();
  if(!response.ok)throw new Error(data.message||"حدث خطأ.");
  return data;
}
export const getDashboard=()=>request("/api/admin/dashboard");
export function getAdminOrders({search="",status="",page=1,limit=20}={}) {
  const p=new URLSearchParams({search,status,page:String(page),limit:String(limit)});
  return request(`/api/admin/orders?${p}`);
}
export const updateOrder=(id,payload)=>request(`/api/admin/orders/${id}`,{method:"PATCH",body:JSON.stringify(payload)});
export const deleteOrder=id=>request(`/api/admin/orders/${id}`,{method:"DELETE"});
export const getAdminProducts=()=>request("/api/admin/products");
export const createProduct=p=>request("/api/admin/products",{method:"POST",body:JSON.stringify(p)});
export const updateProduct=(id,p)=>request(`/api/admin/products/${id}`,{method:"PATCH",body:JSON.stringify(p)});
export const deleteProduct=id=>request(`/api/admin/products/${id}`,{method:"DELETE"});
export function uploadMedia(file){const f=new FormData();f.append("file",file);return request("/api/admin/media",{method:"POST",body:f});}
export const getSettings=()=>request("/api/admin/settings");
export const saveSettings=p=>request("/api/admin/settings",{method:"PUT",body:JSON.stringify(p)});
