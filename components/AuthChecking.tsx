// "use client";
// import React from 'react';
// import LoginForm from './LoginForm';

// const withAuth = (WrappedComponent: any) => {
//     const AuthComponent = (props: any) => {
//         const token = localStorage?.getItem('sara_token');

//         if (!token) {
//             return <LoginForm type={'login'} />;
//         }

//         return <WrappedComponent {...props} />;
//     };

//     // Assign display name for debugging
//     AuthComponent.displayName = `WithAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

//     return AuthComponent;
// };

// export default withAuth;


"use client";
import React, { useEffect, useState } from 'react';
import LoginForm from './LoginForm';

const withAuth = (WrappedComponent: any) => {
    const AuthComponent = (props: any) => {
        const [isClient, setIsClient] = useState(false);

        useEffect(() => {
            setIsClient(true);
        }, []);

        if (!isClient) {
            return null; // or return a loading spinner/skeleton
        }

        const token = window.localStorage.getItem('sara_token');

        if (!token) {
            return <LoginForm type={'login'} />;
        }

        return <WrappedComponent {...props} />;
    };

    AuthComponent.displayName = `WithAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

    return AuthComponent;
};

export default withAuth;