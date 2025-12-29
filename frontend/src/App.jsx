import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import './App.css';
import { DemoPage } from './pages/DemoPage';

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Routes>
           <Route path="/" element={<div><h1>✅ Router & Antd Working</h1></div>} />
           <Route path="/demo" element={<DemoPage />} />
           {/* Admin routes disabled for debug */}
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
