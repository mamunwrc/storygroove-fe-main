import React from 'react';
import './Loader.css';
import { SpinnerDiamond } from 'spinners-react';

const Loader = () => {
  return (
    <div className='loader'>
        <SpinnerDiamond size={50} thickness={100} speed={100} color="#36ad47" secondaryColor="rgba(0, 0, 0, 0.44)" />
    </div>
  )
}

export default Loader;