import React, { useState } from 'react';
import { Form, Button } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { axiosOpen } from '../../api/axios';
import { toast, Toaster } from 'react-hot-toast';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { token, id } = useParams();

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const body = JSON.stringify({
        userId: id,
        token,
        password,
      });

      await axiosOpen.patch('/api/user/resetPassword', body);
      toast.success(
        'Password set — log in to start writing.'
      );
      setError('');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      const errorMessage = err?.response?.data?.message || 'Failed to reset password. Please try again.';
      toast.error(errorMessage);
    }
  };

  // const handleResetPassword = (e) => {
  //   e.preventDefault();
  //   if (password !== confirmPassword) {
  //     setError("Passwords do not match");
  //     return;
  //   }
  //   const body = {
  //     userid : id,
  //     token,
  //     password
  //   }

  //     axiosOpen.patch("/api/user/resetPassword",body)
  //    .then((res) => {
  //       console.log(res)
  //       // navigate("/login");
  //     })
  //     .catch((err) => {
  //       console.log(err)
  //     });

  //   setError("");
  // };

  return (
    <div className="reset-password-page">
      <Toaster />
      <div className="reset-password-container">
        <h3 className="text-center mb-4 ">New Password</h3>
        <Form className="form" onSubmit={handleResetPassword}>
          <Form.Floating>
            <Form.Control
              className="mb-3"
              id="floatingPasswordCustom"
              type="password"
              placeholder="Password"
              autoComplete="off"
              onChange={(e) => {
                setPassword(e.target.value);
              }}
              required
            />
            <label htmlFor="floatingPasswordCustom">Password</label>
          </Form.Floating>
          <Form.Floating>
            <Form.Control
              className="mb-3"
              id="floatingPasswordCustom"
              type="password"
              placeholder="Password"
              autoComplete="off"
              onChange={(e) => {
                setConfirmPassword(e.target.value);
              }}
              required
            />
            <label htmlFor="floatingPasswordCustom ">Confirm Password</label>
          </Form.Floating>
          {error && <div className="text-danger mb-3 text-center">{error}</div>}
          <Button
            variant="primary"
            className="text-decoration-none text-white w-100 mt-4 primary-custom-btn"
            onClick={handleResetPassword}
          >
            Reset Password
          </Button>
        </Form>
      </div>
    </div>
  );
};

export default ResetPassword;
