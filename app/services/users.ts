import { apiGetService, apiPostService } from "./helpers";
export const Apiurl = "http://172.16.4.129:8000/";

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
    return await apiGetService('/nylas/auth_url/', data || {});
}

export const codeexchange = async(data: CodeExchangeData) => {
    return await apiPostService('/nylas/exchange_token/', data);
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
    const apiKey: string = "sk_b8272f9490709c083007957e563b8a08eaca08f2cc0ca043";
    const agentId = "yqPmLc937dY5QUdgudqw";
    
    try {
        const response = await fetch(
            `https://api.elevenlabs.io/v1/convai/history/${id}`,
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