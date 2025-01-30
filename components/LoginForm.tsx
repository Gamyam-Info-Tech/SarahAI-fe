"use client"
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { useForm } from 'react-hook-form'
import GlobalInput from './ui/input'
import { Button } from './ui/button'
import Link from 'next/link'
import { login, registerUser } from '@/app/services/users'
import { useRouter } from 'next/navigation'

interface LoginFormProps {
  type: 'login' | 'register'
}

interface FormData {
  email: string
  password: string
}

interface LoginResponse {
  user: any
  tokens?: {
    access: string
  }
}

const LoginForm = ({ type }: LoginFormProps) => {
  const router = useRouter()
  const methods = useForm<FormData>({ mode: "all" })
  const { control, formState: { errors }, reset } = methods
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [hasToken, setHasToken] = useState(false)

  // Safe localStorage check
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('sara_token')
      if (token) {
        setHasToken(true)
        router.push('/')
      }
    }
  }, [router])

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      if (type === "register") {
        await registerUser(data)
        router.push('/login')
      } else {
        const response = await login(data) as LoginResponse
        if (response.tokens?.access) {
          if (typeof window !== 'undefined') {
            console.log(response)
            localStorage.setItem("sara_token", response.tokens.access)
            localStorage.setItem("id", response.user.id)
            router.push('/')
            window.location.reload()
          }
        }
      }
      reset()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
        console.log(err)
      } else {
        setError('An unexpected error occurred')
      }
    }
    setLoading(false)
  }

  // Prevent flash of login form if user is already logged in
  if (hasToken) {
    return null
  }

  return (
    <div className={"flex justify-center items-center w-[100%] h-[100vh] px-[40px] md:px-[0px] "}>
      <Card className={'rounded-3xl w-[100%] md:w-[400px] '}>
        <CardContent className="p-0">
          <CardHeader>
            <CardTitle className="p-0 text-[24px] text-center">
              {type === "register" ? "Register" : "Login"}
            </CardTitle>
            <div className="flex flex-col gap-5">
              <GlobalInput
                control={control}
                label="Enter Email"
                name="email"
                rules={{
                  required: "Email is required",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Please enter a valid email address',
                  }
                }}
                errors={errors.email}
              />
              <GlobalInput
                control={control}
                label="Password"
                name="password"
                type="password"
                rules={{
                  required: "Password is required",
                }}
                errors={errors.password}
              />
              <div>
                {error && <p className="text-[red] text-center">{error}</p>}
                <Button
                  variant={'outline'}
                  className={'rounded-[12px] h-[50px] w-full'}
                  size={"lg"}
                  onClick={methods.handleSubmit(onSubmit)}
                >
                  {loading ? "Loading..." : type === "register" ? "Register" : "Login"}
                </Button>
              </div>
              {type === "register" ?
                <p className="text-center">Already have an account <Link href="/login"><span className="text-[#797a83]">Login</span></Link> </p>:
                <p className="text-center">{"Don't have an account"}<Link href="/register"><span className="text-[#797a83]">Register</span> </Link></p>}
            </div>
          </CardHeader>
        </CardContent>
      </Card>
    </div>
  )
}

export default LoginForm