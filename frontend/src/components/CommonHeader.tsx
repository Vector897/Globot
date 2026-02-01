import React from 'react';
import { SignedIn, SignedOut, UserButton, useClerk, useUser } from '@clerk/clerk-react';
import { Shield, Menu as MenuIcon, Home, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Dropdown, MenuProps } from 'antd';
import { useHeader } from '../context/HeaderContext';

export const CommonHeader: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { openSignIn } = useClerk();
    const { user } = useUser();
    const { title, subtitle, extraContent, showShieldIcon } = useHeader();

    const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
    // @ts-ignore
    const whitelistStr = import.meta.env.VITE_ADMIN_WHITELIST || '';
    const adminWhitelist = whitelistStr.split(',').map((e: string) => e.trim().toLowerCase());

    const isAdmin =
        user?.publicMetadata?.role === 'admin' ||
        (userEmail && adminWhitelist.includes(userEmail));

    const isDemoPage = location.pathname === '/demo';

    const adminMenuItems: MenuProps['items'] = [
        {
            key: 'dashboard',
            label: '管理控制台',
            onClick: () => navigate('/admin'),
        },
        {
            key: 'customers',
            label: '客户档案管理',
            onClick: () => navigate('/admin'), // In MVP, pointing to same place
        },
        {
            key: 'ai-logs',
            label: 'AI 决策日志',
            disabled: true,
        },
        {
            type: 'divider',
        },
        {
            key: 'settings',
            label: '系统设置',
            disabled: true,
        },
    ];

    return (
        <header style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 20px',
            height: isDemoPage ? '64px' : '56px',
            background: '#0f1621',
            borderBottom: '1px solid #1a2332',
            zIndex: 1000,
            position: 'relative',
            transition: 'height 0.3s ease'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', minWidth: 0 }}>
                <div
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', flexShrink: 0 }}
                    onClick={() => navigate('/pay')}
                >
                    <div style={{
                        width: '32px',
                        height: '32px',
                        background: 'linear-gradient(135deg, #0078d4 0%, #4a90e2 100%)',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Shield style={{ width: '20px', height: '20px', color: 'white' }} />
                    </div>
                    {!isDemoPage && <h3 style={{ color: 'white', margin: 0, fontSize: '1.1rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Globot AI</h3>}
                </div>

                {/* Navigation Links */}
                <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px' }}>
                        <button
                            onClick={() => navigate('/usershome')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: location.pathname === '/usershome' ? '#0078d4' : '#1a2332',
                                border: '1px solid #2d3a4f',
                                color: 'white',
                                padding: '8px 14px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 600,
                                transition: 'all 0.2s'
                            }}
                        >
                            <Home style={{ width: '16px', height: '16px' }} />
                            Home
                        </button>
                        <button
                            onClick={() => navigate('/admin')}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: location.pathname === '/admin' ? '#0078d4' : '#1a2332',
                                    border: '1px solid #2d3a4f',
                                    color: 'white',
                                    padding: '8px 14px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Settings style={{ width: '16px', height: '16px' }} />
                                Admin
                        </button>
                    </nav>

                {isDemoPage && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        <div style={{ minWidth: 0 }}>
                            <h1 style={{
                                margin: 0,
                                fontSize: '18px',
                                fontWeight: 'bold',
                                background: 'linear-gradient(to right, #60a5fa, #67e8f9)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                whiteSpace: 'nowrap'
                            }}>
                                Globot Shield
                            </h1>
                            <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {subtitle}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {isDemoPage && extraContent}

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: isDemoPage ? '1px solid #1a2332' : 'none', paddingLeft: isDemoPage ? '16px' : '0' }}>
                    <SignedIn>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {isAdmin && (
                                <Dropdown menu={{ items: adminMenuItems }} placement="bottomRight" arrow>
                                    <div style={{
                                        cursor: 'pointer',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '4px'
                                    }}>
                                        <MenuIcon style={{ width: '20px', height: '20px' }} />
                                    </div>
                                </Dropdown>
                            )}
                            <UserButton afterSignOutUrl="/pay" />
                        </div>
                    </SignedIn>
                    <SignedOut>
                        <button
                            onClick={() => openSignIn()}
                            style={{
                                padding: '6px 16px',
                                background: '#0078d4',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'background 0.2s'
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.background = '#005a9e')}
                            onMouseOut={(e) => (e.currentTarget.style.background = '#0078d4')}
                        >
                            Login
                        </button>
                    </SignedOut>
                </div>
            </div>
        </header>
    );
};
