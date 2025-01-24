import { apiPostService } from "./helpers";
export const Apiurl = "http://172.17.01:8000";

export const login=async(data:any)=>{
    return await apiPostService('/users/login/',data);

}
export const registerUser=async(data:any)=>{
    return await apiPostService('/users/register/',data);

}

