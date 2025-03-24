import { apiGetService, apiPostService } from "./helpers";

// Define the base URL for API calls
export const baseUrl = process.env.NEXT_PUBLIC_BE_API_URL || "https://clymin.ngrok.dev";

// Interfaces
interface CodeExchangeData {
    code: string;
    id?: string;
}

interface AuthData {
    phone_number: string;
    country_code: string;
    otp?: string;
    name?: string;
}

/**
 * Request OTP for phone number (Login)
 */
export const requestOTP = async (data: { phone_number: string; country_code: string }): Promise<any> => {
    return await apiPostService('/users/login/', data);
};

/**
 * Login with phone number, country code and OTP
 */
export const login = async (data: { phone_number: string; otp: string; country_code: string; request_id: string }): Promise<any> => {
    return await apiPostService('/users/verify_otp/', data);
};

/**
 * Register a new user - this also sends an OTP
 */
export const initiateRegistration = async (data: { name: string; phone_number: string; country_code: string }): Promise<any> => {
    return await apiPostService('/users/register/', data);
};

/**
 * Complete registration with OTP verification
 */
export const verifyAndRegister = async (data: { 
    name: string; 
    phone_number: string; 
    country_code: string; 
    otp: string;
    request_id: string;
}): Promise<any> => {
    // Ensure name is included for registration flow
    return await apiPostService('/users/verify_otp/', data);
};

/**
 * Get connection URL for calendar provider
 */
export const connectionUser = async(data?: any) => {
    return await apiGetService('/nylas/auth_url/', data || {}, true);
};

/**
 * Exchange auth code for provider connection
 */
export const codeexchange = async(data: CodeExchangeData) => {
    return await apiPostService('/nylas/exchange_token/', data, true);
};

/**
 * Store conversation session
 */
export const sessionId = async(data: any) => {
    return await apiPostService('/sessions/store_session/', data);
};

/**
 * Get list of conversation sessions
 */
export const getHistoryId = async() => {
    return await apiGetService('/sessions/');
};

/**
 * Get conversation history details
 */
export const getHistory = async(id: string) => {
    // Return early if id is undefined or null
    if (!id) {
        return null;
    }
    
    const apiKey: string = "sk_f663505088dd237906010c5d9007258bad539fac79f45a99";
    
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
            throw new Error('Failed to get conversation history');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};