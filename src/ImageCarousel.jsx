import React, { useState } from 'react';

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

  const handleThumbnailClick = React.useCallback((index, event) => {
    event.preventDefault();
    event.stopPropagation();
    if (index !== activeImage) {
      setActiveImage(index);
    }
  }, [activeImage]);

  return (
    <div className="image-carousel">
      <div className="carousel-main-image">
        <div className="carousel-image-container">
          <img 
            src={images[activeImage].src}
            alt={images[activeImage].title}
            className="carousel-image loaded"
            loading="lazy"
          />
        </div>
      </div>
      
      <div className="carousel-thumbnails">
        {images.map((image, index) => (
          <button
            key={image.id}
            className={`carousel-thumbnail ${index === activeImage ? 'active' : ''}`}
            onClick={(e) => handleThumbnailClick(index, e)}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            aria-label={`View ${image.title}`}
            type="button"
          >
            <div className="carousel-image-container">
              <img 
                src={image.src}
                alt={image.title}
                className="carousel-image loaded"
                loading="lazy"
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ImageCarousel;
