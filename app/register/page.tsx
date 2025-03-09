import LoginForm from '@/components/LoginForm'
import React from 'react'

const page = () => {
  console.log("Rendering register page"); // Add this debug log
  return (
    <LoginForm type="register"/>
  )
}

export default page
