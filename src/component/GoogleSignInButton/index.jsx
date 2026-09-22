import { useGoogleLogin } from "@react-oauth/google";
import { Button } from 'react-bootstrap';
import { axiosOpen } from '../../api/axios';
import useAuth from '../../hooks/useAuth';
import "./styles.scss";

const GoogleSignInButton = ({
  onSuccess = () => {},
  onError = () => {},
  buttonText = "Sign in with Google",
}) => {
  const { setAuth } = useAuth();

  const handleTest = async (creds) => {
    try {
      const response = await axiosOpen.post('/api/user/social/google', {
        token: creds.access_token,
      });

      const { data } = response;
      localStorage.userID = data?._id;
      localStorage.userToken = data?.token;
      localStorage.userEmail = data?.email;
      localStorage.role = data?.role;
      localStorage.userName = data?.username;
      localStorage.signupType = data?.signupType;
      localStorage.fname = data?.fname;
      localStorage.lname = data?.lname;

      // Adding Protected Route
      const userRole = response?.data?.role === 'superadmin' ? '2010' : '2015';
      localStorage.userStatus = userRole;

      setAuth({
        role: userRole,
        loggedIn: true,
      });

      onSuccess();
    } catch (err) {
      onError(err);
    }
  };

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      handleTest(tokenResponse);
    },
    flow: 'implicit',
  });

  return (
    <div>
      <Button
        className="google-login-btn mt-3 mb-3"
        onClick={() => login()}
      >
        <img
          src="/assets/images/social-icons/google-icon.png"
          alt=""
          width={20}
        />
        {buttonText}
      </Button>
    </div>
  );
}

export default GoogleSignInButton;
