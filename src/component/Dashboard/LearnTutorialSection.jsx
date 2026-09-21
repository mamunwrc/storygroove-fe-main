import React, { useState } from 'react';
import Carousel from '@itseasy21/react-elastic-carousel';
import { Modal } from 'react-bootstrap'; // Import the Modal component

const LearnTutorialSection = () => {
  const carouselItems = [
    '/assets/images/tutorial-1.png',
    '/assets/images/tutorial-2.png',
    '/assets/images/tutorial-3.png',
    '/assets/images/tutorial-4.png',
    '/assets/images/tutorial-1.png',
    '/assets/images/tutorial-2.png',
    '/assets/images/tutorial-3.png',
    '/assets/images/tutorial-4.png',
    // Add more image URLs as needed
  ];

  const videoIds = [
    '8zx9i_Ut1Gk',
    'axxFctfSkQo',
    '8zx9i_Ut1Gk',
    'axxFctfSkQo',
    '8zx9i_Ut1Gk',
    '8zx9i_Ut1Gk',
    'axxFctfSkQo',
    '8zx9i_Ut1Gk',
    // Add more video IDs corresponding to carousel items
  ];
  const breakPoints = [
    { width: 1, itemsToShow: 1 },
    { width: 400, itemsToShow: 4 },
  ];
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(null);

  const openPopup = (index) => {
    setSelectedVideoIndex(index);
  };

  const closePopup = () => {
    setSelectedVideoIndex(null);
  };

  return (
    <div className="tutorial-carousel-section mb-5">
      <div className="carousel-text">
        <p className="body-text-primary m-0">Still Need Help? No problem</p>
        <p className="fw-semibold body-text-primary m-0">Try a Tutorial.</p>
      </div>
      {/* Carousel rendering code... */}
      <Carousel
        className="carousel"
        breakPoints={breakPoints}
        pagination={false}
      >
        {carouselItems.map((item, index) => (
          <div key={`carousel-item-${index}`}>
            <img
              key={`video_${index}`}
              width={180}
              src={item}
              alt={`Carousel Item ${index}`}
              onClick={() => openPopup(index)}
            />
            <div onClick={() => openPopup(index)} className="caption">
              Remove Background
            </div>
          </div>
        ))}
      </Carousel>

      {/* Bootstrap Modal */}
      <Modal
        show={selectedVideoIndex !== null}
        onHide={closePopup}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            How to Remove Background? See the instruction
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <iframe
            width="100%"
            height="315"
            src={`https://www.youtube.com/embed/${videoIds[selectedVideoIndex]}`}
            title="How to Remove Background? See the instruction"
            frameBorder="0"
            allowFullScreen
          ></iframe>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default LearnTutorialSection;
