import React, { useState } from 'react';

// For now, use same images - mobile optimization via CSS only
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
    if (index !== activeImage) {
      setActiveImage(index);
    }
  }, [activeImage]);

  const goToPrevious = React.useCallback(() => {
    setActiveImage((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, []);

  const goToNext = React.useCallback(() => {
    setActiveImage((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, []);

  return (
    <div className="image-carousel">
      <div className="carousel-main-image">
        <div className="carousel-image-container">
          <img 
            src={images[activeImage].src}
            alt={images[activeImage].title}
            className="carousel-image"
            loading={activeImage === 0 ? "eager" : "lazy"}
            decoding="sync"
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
                src={image.src}
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
      
      {/* Mobile arrow navigation */}
      <div className="carousel-navigation">
        <button
          className="carousel-arrow carousel-arrow-prev"
          onClick={goToPrevious}
          aria-label="Previous image"
          type="button"
        >
          ‹
        </button>
        <div className="carousel-counter">
          {activeImage + 1} / {images.length}
        </div>
        <button
          className="carousel-arrow carousel-arrow-next"
          onClick={goToNext}
          aria-label="Next image"
          type="button"
        >
          ›
        </button>
      </div>
    </div>
  );
};

export default ImageCarousel;
