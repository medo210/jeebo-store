async function r(url,o={}){const x=await fetch(url,{headers:{Accept:"application/json",...(o.body?{"Content-Type":"application/json"}:{}),...o.headers},...o}),d=await x.json();if(!x.ok)throw new Error(d.message||"حدث خطأ غير متوقع.");return d}
export const getDashboard=()=>r("/api/admin/dashboard");
export const getAdminOrders=(p={})=>r(`/api/admin/orders?${new URLSearchParams({search:p.search||"",status:p.status||"",page:String(p.page||1),limit:String(p.limit||20)})}`);
export const updateOrder=(id,p)=>r(`/api/admin/orders/${id}`,{method:"PATCH",body:JSON.stringify(p)});
export const deleteOrder=id=>r(`/api/admin/orders/${id}`,{method:"DELETE"});
export const getAdminProducts=()=>r("/api/admin/products");
export const createProduct=p=>r("/api/admin/products",{method:"POST",body:JSON.stringify(p)});
export const updateProduct=(id,p)=>r(`/api/admin/products/${id}`,{method:"PATCH",body:JSON.stringify(p)});
export const deleteProduct=id=>r(`/api/admin/products/${id}`,{method:"DELETE"});
export const getSettings=()=>r("/api/admin/settings");
export const saveSettings=p=>r("/api/admin/settings",{method:"PUT",body:JSON.stringify(p)});