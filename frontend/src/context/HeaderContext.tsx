import React, { createContext, useContext, useState, ReactNode } from 'react';

interface HeaderContextType {
    title: string;
    setTitle: (title: string) => void;
    subtitle: string;
    setSubtitle: (subtitle: string) => void;
    extraContent: ReactNode | null;
    setExtraContent: (content: ReactNode | null) => void;
    showShieldIcon: boolean;
    setShowShieldIcon: (show: boolean) => void;
    resetHeader: () => void;
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

export const HeaderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [title, setTitle] = useState('Globot AI');
    const [subtitle, setSubtitle] = useState('');
    const [extraContent, setExtraContent] = useState<ReactNode | null>(null);
    const [showShieldIcon, setShowShieldIcon] = useState(false);

    const resetHeader = () => {
        setTitle('Globot AI');
        setSubtitle('');
        setExtraContent(null);
        setShowShieldIcon(false);
    };

    return (
        <HeaderContext.Provider value={{
            title, setTitle,
            subtitle, setSubtitle,
            extraContent, setExtraContent,
            showShieldIcon, setShowShieldIcon,
            resetHeader
        }}>
            {children}
        </HeaderContext.Provider>
    );
};

export const useHeader = () => {
    const context = useContext(HeaderContext);
    if (!context) {
        throw new Error('useHeader must be used within a HeaderProvider');
    }
    return context;
};
