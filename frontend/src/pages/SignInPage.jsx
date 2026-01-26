import React from 'react';
import { SignIn } from '@clerk/clerk-react';

export function SignInPage() {
  console.log("[SignInPage] Rendering SignIn component");
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh', 
      width: '100vw',
      backgroundColor: '#0a0a0a' 
    }}>
      <SignIn 
        routing="path" 
        path="/sign-in" 
        afterSignInUrl="/port"
        afterSignUpUrl="/port"
      />
    </div>
  );
}
