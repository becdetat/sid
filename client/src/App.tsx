import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Dashboard from './pages/Dashboard';
import AccountDetail from './pages/AccountDetail';
import Settings from './pages/Settings';

const queryClient = new QueryClient();

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/accounts/:id" element={<AccountDetail />} />
                    <Route path="/settings" element={<Settings />} />
                </Routes>
            </BrowserRouter>
            <Toaster
                position="bottom-center"
                toastOptions={{
                    style: {
                        background: 'var(--teak-dark)',
                        color: 'var(--cream)',
                        borderRadius: '99px',
                        fontSize: '13px',
                        fontWeight: '600',
                        fontFamily: 'var(--font-body)',
                        border: 'none',
                        padding: '10px 20px',
                    },
                    classNames: { error: 'sid-toast-error' },
                }}
            />
        </QueryClientProvider>
    );
}
