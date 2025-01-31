import { apiGetService, apiPostService } from "./helpers";
export const Apiurl = "http://192.168.31.34:8000/";

interface CodeExchangeData {
    code: string;
    id?: string;
}

export const login = async(data: any) => {
    return await apiPostService('/users/login/', data);
}

export const registerUser = async(data: any) => {
    return await apiPostService('/users/register/', data);
}

export const connectionUser = async(data?: any) => {
    return await apiGetService('/nylas/auth_url/', data || {},true);
}

export const codeexchange = async(data: CodeExchangeData) => {
    return await apiPostService('/nylas/exchange_token/', data,true);
}

export const historyUser = async(data: any) => {
    return await apiGetService('/v1/history/');
}

export const sessionId = async(data: any) => {
    return await apiPostService('/sessions/store_session/', data);
}

export const getHistoryId = async() => {
    return await apiGetService('/sessions/');
}

export const getHistory = async(id: any) => {
    const apiKey: string = "sk_f663505088dd237906010c5d9007258bad539fac79f45a99";
    const agentId = "FJVa4IrSWE78kdgdNjI1";
    
    try {
        const response = await fetch(
            `https://api.elevenlabs.io/v1/convai/conversations/${id}`,
            {
                method: 'GET',
                headers: {
                    'xi-api-key': apiKey,
                }
            }
        );

        if (!response.ok) {
            throw new Error('Failed to get signed URL');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}