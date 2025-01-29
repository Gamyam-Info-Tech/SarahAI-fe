import { apiGetService, apiPostService } from "./helpers";
export const Apiurl = "http://172.17.01:8000";

export const login=async(data:any)=>{
    return await apiPostService('/users/login/',data);

}
export const registerUser=async(data:any)=>{
    return await apiPostService('/users/register/',data);

}
export const connectionUser=async(data?:any)=>{
    return await apiGetService('/nylas/auth_url/',data || {});
}
export const codeexchange=async(data:any)=>{
    return await apiPostService('/nylas/exchange_token/',data);
}
