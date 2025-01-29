"use client";
import { Button } from "./ui/button";
import React, { useState, useEffect } from 'react';
import { connectionUser, codeexchange } from '../app/services/users';
import { useSearchParams, useRouter } from 'next/navigation';

interface ConnectionData {
  provider: string;
  grant_id: string;
}

const Connect = () => {
  const token=localStorage.getItem("sara_token")
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [connectedProvider, setConnectedProvider] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Check localStorage on component mount
  useEffect(() => {
    const storedConnection = localStorage.getItem('connectionData');
    if (storedConnection) {
      const connectionData: ConnectionData = JSON.parse(storedConnection);
      setConnectedProvider(connectionData.provider);
    }
  }, []);

  useEffect(() => {
    const code = searchParams.get('code');
    console.log("called")
    if (code) {
      console.log("called code")
      handleCodeExchange(code);
    }
  }, [searchParams]);

  const handleCodeExchange = async (code: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await codeexchange({ code });
      console.log("reponse",response)
      console.log('Code exchange successful:', response);
      
      if (response?.grant_id && response?.provider) {
        // Store the connection data in localStorage
        const connectionData: ConnectionData = {
          provider: response.provider,
          grant_id: response.grant_id,
        };
        localStorage.setItem('connectionData', JSON.stringify(connectionData));
        
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
      const response = await connectionUser();
      
      console.log('Connection successful:', response);
      
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

  const handleDisconnect = () => {
    localStorage.removeItem('connectionData');
    setConnectedProvider(null);
  };

  const getButtonText = () => {
    if (isLoading) return 'Processing...';
    if (connectedProvider) return `Connected with ${connectedProvider.charAt(0).toUpperCase() + connectedProvider.slice(1)}`;
    return 'Connect with SARAHAI';
  };
if(!token){
return null
}
const handleLogout=()=>{
  localStorage.clear()
  router.push("/login")
}
  return (
    <div className="flex items-center gap-4">

      <Button onClick={handleLogout} variant="outline" >Logout</Button>

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
      
      {connectedProvider && (
        <Button 
          onClick={handleDisconnect}
          variant="outline"
          className="ml-2"
        >
          Disconnect
        </Button>
      )}
      
      {error && (
        <p className="text-red-500 text-sm">
          {error}
        </p>
      )}
    </div>
  );
};

export default Connect;