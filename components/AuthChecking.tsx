"use client"
import React from 'react'; // For redirection in Next.js
import LoginForm from './LoginForm'; // Replace with your LoginForm component

const withAuth = (WrappedComponent:any) => {
    return (props:any) => {
        // const router = useRouter();

        // Check if the code is running in the browser (important for SSR)
      
            const token = localStorage.getItem('sara_token');

            // If no token, redirect to login or show the login form
            if (!token) {
                return <LoginForm type={'login'} />;
                // Alternatively, redirect the user:
                // router.push('/login');
                // return null;
            }
        

        // If authenticated, render the wrapped component
        return <WrappedComponent {...props} />;
    };
};

export default withAuth;
