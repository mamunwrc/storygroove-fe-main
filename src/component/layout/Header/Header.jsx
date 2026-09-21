import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getUserID } from '../../../service/service';
import { axiosOpen } from '../../../api/axios';
import { IoIosArrowDown } from 'react-icons/io';
import { NewAuthContext } from '../../../contexts/NewAuthProvider';
import { ImageContext } from '../../../contexts/imageContext';
const Header = () => {
  const { logout } = useContext(NewAuthContext);
  const {
    setCurImage,
    setImageNoBg,
    setOriginalImage,
    setBackgroundImg,
    setSavedImage,
    setProject,
    userImages,
    setUserImages,
    setUserTrack,
  } = useContext(ImageContext);

  const navigate = useNavigate();
  const [, setRole] = useState('');
  const userId = getUserID();
  const [initiateLogout, setInitiateLogout] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const response = await axiosOpen.get('api/user/getuser', {
        headers: {
          authorization: 'Bearer ' + localStorage.userToken,
        },
      });

      if (response.data.image && response.data.image.data) {
        const blob = new Blob([Int8Array.from(response.data.image.data.data)], {
          type: response.data.image.contentType,
        });

        const image = window.URL.createObjectURL(blob);
        setUserImages(image);
      }
      setRole(response?.data?.user?.role);
    }
    fetchData();
  }, [setUserImages, userId]);
  console.log(userImages);

  // const handleLogout =() => {
  //   // clear all the states before logout
  //   setCurImage(null);
  //   setImageNoBg(null);
  //   setOriginalImage(null);
  //   setBackgroundImg(null);
  //   setSavedImage(null);
  //   setProject(null);
  //   localStorage.clear();
  //   logout();
  //   navigate('/login');
  // };

  const handleLogout = () => {
    // Set all related logout states
    setUserTrack((prevState) => ({}));

    setTimeout(() => {
      if (getUserID()) {
        setInitiateLogout(true);
      }
    }, [1000]);
  };

  useEffect(() => {
    if (initiateLogout) {
      const performLogout = () => {
        // Clear React states
        setCurImage(null);
        setImageNoBg(null);
        setOriginalImage(null);
        setBackgroundImg(null);
        setSavedImage(null);
        setProject(null);

        localStorage.clear();

        logout();
        setInitiateLogout(false);
        navigate('/login');
      };
      performLogout();
    }
  }, [initiateLogout, logout, navigate, setBackgroundImg, setCurImage, setImageNoBg, setOriginalImage, setProject, setSavedImage]);

  return (
    <>
      <nav
        className="navbar navbar-expand sticky-top"
        aria-label="Second navbar example"
      >
        <div className="container-fluid px-0 d-flex  justify-content-between  align-items-center">
          <div className="logo ms-md-3 ms-0">
            <Link to="/dashboard" className="text-decoration-none">
              <p className="logo-text">StoryGroove AI</p>
            </Link>
          </div>
          <div className="header-dropdown">
            <div
              className="btn-group gap-2 align-items-center d-flex"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <button className=" dropdown-btn" type="button">
                {/* {firstLtr} */}
                <img src={userImages || '/assets/images/avatar.jpg'} alt="" />
              </button>
              <IoIosArrowDown className="dropdown-icon" />
              <ul className="dropdown-menu dropdown-menu-lg-end">
                <li onClick={() => navigate('/dashboard/userprofile')}>
                  <a className="dropdown-item" href="/dashboard/userprofile">
                    Profile
                  </a>
                </li>

                <li>
                  <button type="button" className="dropdown-item" onClick={handleLogout}>
                    Log out
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Header;
