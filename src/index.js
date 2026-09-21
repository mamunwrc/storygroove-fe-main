import React from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './sass/main.scss';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { NewAuthProvider } from './contexts/NewAuthProvider';
import { ManagedUIContext } from './contexts/ManagedUIContext';
import { ThemeProvider } from '@mui/material';
import theme from './theme';
import { ToastContainer } from 'react-toastify';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  // <React.StrictMode>
  //  </React.StrictMode>
  <ThemeProvider theme={theme}>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <NewAuthProvider>
        <ManagedUIContext>
          <Routes>
            <Route path="/*" element={<App />} />
          </Routes>
          <ToastContainer
            position="top-right"
            autoClose={1000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick={false}
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </ManagedUIContext>
      </NewAuthProvider>
    </BrowserRouter>
  </ThemeProvider>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics . Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
