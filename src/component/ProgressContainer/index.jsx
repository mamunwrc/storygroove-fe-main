import React, { useEffect, useState } from 'react';
import ProgressBar from 'react-bootstrap/ProgressBar';

const styles = {
  progressContainer: {
    borderRadius: '20px',
    background: '#F8F8F8',
    maxWidth: '100%',
    width: '100%',
    height: '100%',
    padding: '30px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    aspectRatio: '2/1',
  },
  progressBar: {
    height: '8px',
    borderRadius: '100px',
    background: '#E7E7E7',
  },
};

const ProgressContainer = () => {
  const [progressRate, setProgressRate] = useState(0);
  useEffect(() => {
    const intervalID = setInterval(() => {
      setProgressRate((value) => value + 5);
    }, 1000);
    return () => clearInterval(intervalID);
  });
  return (
    <div style={styles.progressContainer}>
      <ProgressBar now={progressRate} style={styles.progressBar} />
    </div>
  );
};

export default ProgressContainer;
