import React, { useState } from 'react';

const ImageCarousel = () => {
  const [activeImage, setActiveImage] = useState(0);

  const images = [
    {
      id: 1,
      title: 'Solar Array View',
      src: '/images/IMG_1033.jpeg',
      fallbackGradient: 'linear-gradient(135deg, #1a2980 0%, #26d0ce 100%)',
      icon: '🌟'
    },
    {
      id: 2,
      title: 'Cell Detail',
      src: '/images/IMG_2849.jpeg',
      fallbackGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      icon: '🔬'
    },
    {
      id: 3,
      title: 'Mars Installation',
      src: '/images/IMG_4944.jpeg',
      fallbackGradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      icon: '🚀'
    },
    {
      id: 4,
      title: 'Technical Specs',
      src: '/images/IMG_6598.jpeg',
      fallbackGradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      icon: '⚡'
    }
  ];

  const generateImage = (image) => (
    <div className="carousel-image-container">
      <img 
        src={image.src}
        alt={image.title}
        className="carousel-image"
        onError={(e) => {
          // Fallback to gradient if image fails to load
          e.target.style.display = 'none';
          e.target.nextElementSibling.style.display = 'flex';
        }}
      />
      <div 
        className="carousel-image-fallback"
        style={{ 
          background: image.fallbackGradient,
          display: 'none'
        }}
      >
        <div className="carousel-image-overlay">
          <div className="carousel-image-icon">{image.icon}</div>
          <div className="carousel-image-title">{image.title}</div>
        </div>
      </div>
    </div>
  );

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
