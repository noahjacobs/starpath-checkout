import React, { useState, useEffect } from 'react';

const images = [
  {
    id: 1,
    title: 'Solar Array View',
    src: '/images/2.jpeg'
  },
  {
    id: 2,
    title: 'Cell Detail',
    src: '/images/3.jpeg'
  },
  {
    id: 3,
    title: 'Mars Installation',
    src: '/images/4.jpeg'
  },
  {
    id: 4,
    title: 'Technical Specs',
    src: '/images/5.jpeg'
  },
  {
    id: 5,
    title: 'Additional View',
    src: '/images/6.jpeg'
  }
];

const ImageCarousel = () => {
  const [activeImage, setActiveImage] = useState(0);

  // Simple approach: just show images immediately, let browser handle caching

  const generateImage = React.useCallback((image) => {
    return (
      <div className="carousel-image-container">
        <img 
          src={image.src}
          alt={image.title}
          className="carousel-image loaded"
          loading="lazy"
        />
      </div>
    );
  }, []);

  return (
    <div className="image-carousel">
      <div className="carousel-main-image">
        {generateImage(images[activeImage])}
      </div>
      
      <div className="carousel-thumbnails">
        {images.map((image, index) => (
          <button
            key={image.id}
            className={`carousel-thumbnail ${index === activeImage ? 'active' : ''}`}
            onClick={() => setActiveImage(index)}
            aria-label={`View ${image.title}`}
          >
            {generateImage(image)}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ImageCarousel;
