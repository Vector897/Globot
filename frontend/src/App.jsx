import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import './App.css';
import { DemoPage } from './pages/DemoPage';
import { PaymentPage } from './pages/PaymentPage';
import { PortSelectionPage } from './pages/PortSelectionPage';

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Routes>
           <Route path="/" element={<Navigate to="/pay" replace />} />
           <Route path="/pay" element={<PaymentPage />} />
           <Route path="/port" element={<PortSelectionPage />} />
           <Route path="/demo" element={<DemoPage />} />
           {/* Admin routes disabled for debug */}
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
