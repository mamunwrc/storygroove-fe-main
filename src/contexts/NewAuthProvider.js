import { createContext, useState } from 'react';
import { axiosSecureInstance } from '../api/axios';

export const NewAuthContext = createContext({});

export const NewAuthProvider = ({ children }) => {
  let role = localStorage.getItem('userStatus');
  const [user, setUser] = useState('');

  const token = localStorage.getItem('tiktok') || '';

  const [tiktokToken, setTiktokToken] = useState(token);
  const [showModel, setShowModel] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [auth, setAuth] = useState({
    role,
  });

  const logout = async () => {
    try {
      await axiosSecureInstance.post('/api/user/logout');
    } catch (_e) {
      // still clear session client-side
    }
    localStorage.removeItem('userToken');
    localStorage.removeItem('userID');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('fname');
    localStorage.removeItem('lname');
    localStorage.removeItem('role');
    localStorage.removeItem('userStatus');
    localStorage.removeItem('keyExist');
    setAuth({
      role: '',
    });
    setUser('');
  };

  return (
    <NewAuthContext.Provider
      value={{
        auth,
        setAuth,
        user,
        setUser,
        logout,
        tiktokToken,
        setTiktokToken,
        showModel,
        setShowModel,
        showUploadModal,
        setShowUploadModal
      }}
    >
      {children}
    </NewAuthContext.Provider>
  );
};

export default NewAuthContext;
