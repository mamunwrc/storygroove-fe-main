import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Spinner } from "react-bootstrap";
import { verifyUserToken } from "../../api/user";
import ResendVerificationPanel from "../../component/ResendVerification/ResendVerificationPanel";

const VerifyToken = () => {
  const { token } = useParams();
  const [validatedToken, setValidatedToken] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setMessage("Invalid Token");
      return;
    } else {
      // added to prevent multiple api calls
      if (localStorage.getItem("apiCalled") === null) {
        localStorage.setItem("apiCalled", true);
        verifyUserToken(token)
          .then((res) => {
            if (res.success && res.data?.passwordSetupRequired) {
              const { setupToken, userId } = res.data;
              window.location.href = `/passwordReset/${setupToken}/${userId}`;
              return;
            }
            if (res.success && res.data?.token) {
              localStorage.userToken = res.data.token;
              localStorage.userID = res.data.userid;
              localStorage.role = res.data.role;
              localStorage.userName = res.data.userName;
              localStorage.userEmail = res.data.email;
              localStorage.fname = res.data.fname;
              localStorage.lname = res.data.lname;
              const userRole =
                res.data.role === "superadmin" ? "2010" : "2015";
              localStorage.userStatus = userRole;
              if (res.data.openaikeyExist) {
                localStorage.setItem("keyExist", res.data.openaikeyExist);
              }
              window.location.href = "/dashboard";
            } else if (res.success) {
              setValidatedToken(true);
            } else {
              setMessage(res.message);
              setValidatedToken(false);
            }
          })
          .catch((err) => {
            console.log(err);
            setValidatedToken(false);
          })
          .finally(() => {
            localStorage.removeItem("apiCalled");
          });
      }
    }
  }, [token]);

  return (
    <>
      <div className="auth-page">
        <div className="auth-background">
          <div className="page-half">
            <div className="form-fields-container">
              {validatedToken === null ? (
                <Spinner />
              ) : (
                <div className="col-md-12">
                  {validatedToken ? (
                    <div className="alert alert-success">
                      <h4 className="alert-heading">Success!</h4>
                      <p>Your account has been verified successfully.</p>
                      <hr />
                      <p>You can now login to your account.</p>
                      <a href="/login" className="btn btn-primary">
                        Login
                      </a>
                    </div>
                  ) : (
                    <div className="alert alert-danger">
                      <h4 className="alert-heading">Error!</h4>
                      <p>{message}</p>
                      <hr />
                      <ResendVerificationPanel
                        onSuccess={(sentTo) =>
                          setMessage(
                            `If ${sentTo} is registered, a new verification link has been sent.`
                          )
                        }
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default VerifyToken;
