import React, { useState } from 'react';

// Mobile-optimized image loading
const isMobile = () => {
  return window.innerWidth <= 768 || 
         (typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent));
};

// For now, use same images but with mobile-optimized loading
// TODO: Create smaller versions like /images/mobile/2.jpeg for production
const images = [
  {
    id: 1,
    title: 'Solar Array View',
    src: '/images/2.jpeg',
    mobileSrc: '/images/2.jpeg' // TODO: Replace with smaller version
  },
  {
    id: 2,
    title: 'Cell Detail',
    src: '/images/3.jpeg',
    mobileSrc: '/images/3.jpeg' // TODO: Replace with smaller version
  },
  {
    id: 3,
    title: 'Mars Installation',
    src: '/images/4.jpeg',
    mobileSrc: '/images/4.jpeg' // TODO: Replace with smaller version
  },
  {
    id: 4,
    title: 'Technical Specs',
    src: '/images/5.jpeg',
    mobileSrc: '/images/5.jpeg' // TODO: Replace with smaller version
  },
  {
    id: 5,
    title: 'Additional View',
    src: '/images/6.jpeg',
    mobileSrc: '/images/6.jpeg' // TODO: Replace with smaller version
  }
];

// Get appropriate image source based on device
const getImageSrc = (image) => {
  return isMobile() ? image.mobileSrc : image.src;
};

const ImageCarousel = () => {  
  const [activeImage, setActiveImage] = useState(0);

  const handleThumbnailClick = React.useCallback((index, event) => {
    if (index !== activeImage) {
      setActiveImage(index);
    }
  }, [activeImage]);

  return (
    <div className="image-carousel">
      <div className="carousel-main-image">
        <div className="carousel-image-container">
          <img 
            src={getImageSrc(images[activeImage])}
            alt={images[activeImage].title}
            className="carousel-image loaded"
            loading="lazy"
            decoding="async"
            fetchpriority={activeImage === 0 ? "high" : "low"}
          />
        </div>
      </div>
      
      <div className="carousel-thumbnails">
        {images.map((image, index) => (
          <button
            key={image.id}
            className={`carousel-thumbnail ${index === activeImage ? 'active' : ''}`}
            onClick={(e) => handleThumbnailClick(index, e)}
            aria-label={`View ${image.title}`}
            type="button"
          >
            <div className="carousel-image-container">
              <img 
                src={getImageSrc(image)}
                alt={image.title}
                className="carousel-image loaded"
                loading="lazy"
                decoding="async"
                fetchpriority="low"
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ImageCarousel;
