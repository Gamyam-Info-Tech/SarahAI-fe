"use client"
import React,{useState} from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { useForm } from 'react-hook-form'
import GlobalInput from './ui/input';
import { Button } from './ui/button';
import Link from 'next/link'
import { login, registerUser } from '@/app/services/users';
import { useRouter } from 'next/navigation'
const LoginForm =({type}:any) => {
    const router = useRouter()
    const methods = useForm({ mode: "all"});
    const { control, formState: { errors, dirtyFields }, setValue, getValues,reset } = methods;
const [loading,setLoading]=useState(false)
const [error,setError]=useState("")
const onSubmit=async(data)=>{
    setLoading(true)
    try{
        if(type==="register"){
      await registerUser(data)
      router.push('/')
        }else{
          const response=  await login(data);
        
            localStorage.setItem("sara_token",response.tokens?.access)
            router.push('/dashboard')
        }
        reset()

    }catch(err){
       setError(err.message)
        console.log(err)
    }
    setLoading(false)
}

  return (
    <div className={"flex justify-center items-center w-[100%] h-[100vh] px-[40px] md:px-[0px] "}>
            <Card className={'rounded-3xl w-[100%] md:w-[400px] '}>
                <CardContent className="p-0">
                    <CardHeader>
                        <CardTitle className="p-0 text-[24px] text-center">
                            {type==="register"?"Register":"Login"}
                        </CardTitle>
                      <div className="flex flex-col gap-5">
                           <GlobalInput control={control}  label="Enter Email" name="email"
                           rules={{
                            required:"Email is required",
                            pattern: {
                              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // Regex for email validation
                              message: 'Please enter a valid email address', // Error message for invalid email
                            }
                            
                        }}
                        errors={errors.email}
                           />
                           <GlobalInput control={control}  label="Password" name="password" type="password"
                            rules={{
                                required:"Password is required",
                               }}
                               errors={errors.password}/>
                               <div>
                               {error&&<p className="text-[red] text-center">{error}</p>}
                          <Button 

                      
                          variant={'outline'}
                            className={'rounded-[12px] h-[50px] w-full'}
                            size={"lg"}
                            // disabled={conversation === null && !isConnected}
                            onClick={methods.handleSubmit(onSubmit)}
                            >
                             {loading?"Loading...":type==="register"?"Register":"Login"}
                            </Button>
                            </div>
                            {type==="register"? <p className="text-center ">Already have an account <Link href="/"><span className="text-[#797a83]">Login</span></Link> </p>:
                             <p className="text-center">Don't have an account <Link href="/register"><span className="text-[#797a83]">Register</span> </Link></p>}
                           </div>
                    </CardHeader>
                 
                </CardContent>
            </Card>
        </div>
  )
}

export default LoginForm
