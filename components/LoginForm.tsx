"use client"
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { useForm } from 'react-hook-form'
import GlobalInput from './ui/input'
import { Button } from './ui/button'
import Link from 'next/link'
import { login, registerUser, requestOTP } from '@/app/services/users'
import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

// Common country codes
const COUNTRY_CODES = [
  { code: '+1', name: 'United States/Canada' },
  { code: '+44', name: 'United Kingdom' },
  { code: '+91', name: 'India' },
  { code: '+61', name: 'Australia' },
  { code: '+86', name: 'China' },
  { code: '+33', name: 'France' },
  { code: '+49', name: 'Germany' },
  { code: '+81', name: 'Japan' },
  { code: '+971', name: 'UAE' },
  { code: '+65', name: 'Singapore' },
  { code: '+27', name: 'South Africa' },
  { code: '+55', name: 'Brazil' },
  { code: '+52', name: 'Mexico' },
  { code: '+82', name: 'South Korea' },
];

interface LoginFormProps {
  type: 'login' | 'register'
}

interface FormData {
  phone_number: string;
  country_code: string;
  otp?: string;
  name?: string;
}

interface LoginResponse {
  user: any;
  tokens?: {
    access: string;
  }
}

const LoginForm = ({ type }: LoginFormProps) => {
  const router = useRouter();
  const methods = useForm<FormData>({
    mode: "all",
    defaultValues: {
      country_code: '+1' // Default country code
    }
  });
  
  const { control, formState: { errors }, reset, getValues, setValue, watch } = methods;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasToken, setHasToken] = useState(false);
  const [otpRequested, setOtpRequested] = useState(false);
  const [requestingOTP, setRequestingOTP] = useState(false);
  
  // Watch the country code for changes
  const selectedCountryCode = watch('country_code');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('sara_token');
      if (token) {
        setHasToken(true);
        router.push('/');
      }
    }
  }, [router]);

  const handleRequestOTP = async () => {
    const phone_number = getValues('phone_number');
    const country_code = getValues('country_code');
    
    if (!phone_number) {
      setError('Please enter a valid phone number');
      return;
    }
    
    try {
      setRequestingOTP(true);
      setError('');
      // Call the API to request OTP
      await requestOTP({ 
        phone_number,
        country_code 
      });
      setOtpRequested(true);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
        console.log(err);
      } else {
        setError('Failed to send OTP');
      }
    } finally {
      setRequestingOTP(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(""); 
    try {
      if (type === "register") {
        // For registration, make sure name is provided
        if (!data.name) {
          setError("Username is required");
          setLoading(false);
          return;
        }
        
        await registerUser({
          name: data.name,
          phone_number: data.phone_number,
          country_code: data.country_code
        });
        
        router.push('/login');
      } else {
        // For login, we need to make sure OTP is provided
        if (!data.otp) {
          setError("OTP is required");
          setLoading(false);
          return;
        }
        
        const response = await login({
          phone_number: data.phone_number,
          country_code: data.country_code,
          otp: data.otp
        }) as LoginResponse;
        
        if (response.tokens?.access) {
          if (typeof window !== 'undefined') {
            localStorage.setItem("sara_token", response.tokens.access);
            localStorage.setItem("id", response.user.id);
            localStorage.setItem("user_name", response.user.name);
            if(response?.user?.provider){
              localStorage.setItem("provider", response.user.provider);
            }
            router.push('/');
            window.location.reload();
          }
        }
      }
      reset();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
        console.log(err);
      } else {
        setError('An unexpected error occurred');
      }
    }
    setLoading(false);
  };

  if (hasToken) {
    return null;
  }

  return (
    <div className="flex justify-center items-center w-[100%] h-[100vh] px-[40px] md:px-[0px]">
      <Card className="rounded-3xl w-[100%] md:w-[400px]">
        <CardContent className="p-0">
          <CardHeader>
            <CardTitle className="p-0 text-[24px] text-center">
              {type === "register" ? "Register" : "Login"}
            </CardTitle>
            <div className="flex flex-col gap-5">
              {type === "register" && (
                <GlobalInput
                  control={control}
                  label="Username"
                  name="name"
                  rules={{
                    required: "Username is required",
                    minLength: {
                      value: 3,
                      message: 'Username must be at least 3 characters'
                    }
                  }}
                  errors={errors.name}
                />
              )}
              
              {/* Country Code Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Country Code</label>
                <Select
                  defaultValue={selectedCountryCode}
                  onValueChange={(value: string) => setValue('country_code', value)}
                >
                  <SelectTrigger className="rounded-[12px] h-[50px]">
                    <SelectValue placeholder="Select country code" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_CODES.map(country => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.code} ({country.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <GlobalInput
                control={control}
                label="Phone Number"
                name="phone_number"
                rules={{
                  required: "Phone number is required",
                  pattern: {
                    value: /^[0-9]{6,15}$/,
                    message: 'Please enter a valid phone number (numbers only)'
                  }
                }}
                errors={errors.phone_number}
              />
              
              {type === "login" && (
                <>
                  {!otpRequested ? (
                    <Button
                      variant="outline"
                      className="rounded-[12px] h-[50px] w-full"
                      size="lg"
                      onClick={handleRequestOTP}
                      disabled={requestingOTP}
                    >
                      {requestingOTP ? "Sending..." : "Request OTP"}
                    </Button>
                  ) : (
                    <GlobalInput
                      control={control}
                      label="Enter OTP"
                      name="otp"
                      rules={{
                        required: "OTP is required",
                        pattern: {
                          value: /^[0-9]{4,6}$/,
                          message: 'Please enter a valid OTP'
                        }
                      }}
                      errors={errors.otp}
                    />
                  )}
                </>
              )}
              
              <div>
                {error && <p className="text-[red] text-center">{error}</p>}
                <Button
                  variant="outline"
                  className="rounded-[12px] h-[50px] w-full"
                  size="lg"
                  onClick={methods.handleSubmit(onSubmit)}
                  disabled={type === "login" && (!otpRequested || loading)}
                >
                  {loading ? "Loading..." : type === "register" ? "Register" : "Login"}
                </Button>
              </div>
              
              {type === "register" ? (
                <p className="text-center">
                  Already have an account <Link href="/login"><span className="text-[#797a83]">Login</span></Link>
                </p>
              ) : (
                <p className="text-center">
                  Don't have an account <Link href="/register"><span className="text-[#797a83]">Register</span></Link>
                </p>
              )}
            </div>
          </CardHeader>
        </CardContent>
      </Card>
    </div>
  )
}

export default LoginForm