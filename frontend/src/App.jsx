import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import {
  SignedIn,
  SignedOut,
  RedirectToSignIn,
  SignIn,
  SignUp,
  UserButton
} from '@clerk/clerk-react';
import './App.css';
import { DemoPage } from './pages/DemoPage';
import { PaymentPage } from './pages/PaymentPage';
import { PortSelectionPage } from './pages/PortSelectionPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { CommonHeader } from './components/CommonHeader';
import { HeaderProvider } from './context/HeaderContext';

import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { SignInPage } from './pages/SignInPage';
import { AdminPage } from './pages/AdminPage';
import { UsersHome } from './pages/UsersHome';

// Import publishable key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key")
}

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function RouteTracker() {
  const location = useLocation();
  useEffect(() => {
    console.log("📍 Route transition:", location.pathname);
  }, [location]);
  return null;
}

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <HeaderProvider>
        <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
          <BrowserRouter>
            <CommonHeader />
            <RouteTracker />
            <Routes>
              <Route path="/" element={<Navigate to="/pay" replace />} />
              <Route path="/pay" element={<PaymentPage />} />
              
              <Route path="/usershome" element={<UsersHome />} />
              
              {/* Authentication Routes */}
              <Route path="/sign-in/*" element={<SignInPage />} />
              <Route
                path="/sign-up/*"
                element={<div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}><SignUp routing="path" path="/sign-up" /></div>}
              />

              <Route
                path="/port"
                element={
                  <>
                    <SignedIn>
                      <PortSelectionPage />
                    </SignedIn>
                    <SignedOut>
                      <RedirectToSignIn />
                    </SignedOut>
                  </>
                }
              />
              <Route
                path="/demo"
                element={
                  <>
                    <SignedIn>
                      <DemoPage />
                    </SignedIn>
                    <SignedOut>
                      <RedirectToSignIn />
                    </SignedOut>
                  </>
                }
              />
              <Route
                path="/admin"
                element={
                  <>
                    <SignedIn>
                      <AdminPage />
                    </SignedIn>
                    <SignedOut>
                      <RedirectToSignIn />
                    </SignedOut>
                  </>
                }
              />
            </Routes>
          </BrowserRouter>
        </ClerkProvider>
      </HeaderProvider>
    </ConfigProvider>
  );
}

export default App;
