const getUserID = () => {
  return localStorage.getItem('userID');
};

const getUserToken = () => {
  return localStorage.getItem('userToken');
};

const isLoggedIn = () => {
  return !!(localStorage.getItem('userToken') && localStorage.getItem('userID'));
};
const logout = () => {
  localStorage.clear();
};

export { getUserID, getUserToken, isLoggedIn, logout };
