"use client";
import { Button } from "./ui/button";
import React, { useState, useEffect,Suspense } from 'react';
import { connectionUser, codeexchange } from '../app/services/users';
import { useSearchParams, useRouter } from 'next/navigation';

interface ConnectionData {
  provider: string;
  grant_id: string;
}

// Add interfaces for API responses
interface ConnectionResponse {
  auth_url: string;
}

interface CodeExchangeResponse {
  provider: string;
  grant_id: string;
}

const ConnectContent = () => {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [connectedProvider, setConnectedProvider] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const storedToken = window.localStorage.getItem("sara_token");
    if (!storedToken) {
      router.push("/login");
      return;
    }
    setToken(storedToken);

    const storedConnection = window.localStorage.getItem('connectionData');
    if (storedConnection) {
      try {
        const connectionData: ConnectionData = JSON.parse(storedConnection);
        setConnectedProvider(connectionData.provider);
      } catch (error) {
        console.error('Error parsing connection data:', error);
      }
    }
  }, [router]);

  useEffect(() => {
    const code = searchParams.get('code');
    if (code && token) {
      handleCodeExchange(code);
    }
  }, [searchParams, token]);

  const handleCodeExchange = async (code: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await codeexchange({ code }) as CodeExchangeResponse;
      
      if (response?.grant_id && response?.provider) {
        const connectionData: ConnectionData = {
          provider: response.provider,
          grant_id: response.grant_id,
        };
        window.localStorage.setItem('connectionData', JSON.stringify(connectionData));
        
        setConnectedProvider(response.provider);
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      let errorMessage: string;
      
      try {
        const parsedError = JSON.parse(err.message);
        errorMessage = parsedError.error || parsedError.details || 'Failed to exchange code';
      } catch {
        errorMessage = err.message || 'Failed to exchange code';
      }
      
      setError(errorMessage);
      console.error('Code exchange error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await connectionUser() as ConnectionResponse;
      
      if (response?.auth_url) {
        window.location.href = response.auth_url;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect');
      console.error('Connection error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    window.localStorage.clear();
    setToken(null);
    setConnectedProvider(null);
    router.push("/login");
  };

  const getButtonText = () => {
    if (isLoading) return 'Processing...';
    if (connectedProvider) return `Connected with ${connectedProvider.charAt(0).toUpperCase() + connectedProvider.slice(1)}`;
    return 'Connect with SARAHAI';
  };

  if (!token) {
    return null;
  }

  return (
    <div className="flex items-center gap-4">
      <Button onClick={handleLogout} variant="outline">Logout</Button>

      <Button 
        onClick={handleConnect}
        variant="secondary"
        className={`${connectedProvider 
          ? 'bg-green-500 hover:bg-green-600 text-white border-green-400' 
          : 'bg-black hover:bg-gray-800 text-white border-gray-700'
        } border rounded-md px-4 py-2 text-sm font-medium`}
      >
        {getButtonText()}
      </Button>
      
      {error && (
        <p className="text-red-500 text-sm">
          {error}
        </p>
      )}
    </div>
    
  );
};

const Connect = () => {
  return (
    <Suspense fallback={
      <div className="flex items-center gap-4">
        <Button variant="outline" disabled>Loading...</Button>
      </div>
    }>
      <ConnectContent />
    </Suspense>
  );
};

export default Connect;
// export default Connect;