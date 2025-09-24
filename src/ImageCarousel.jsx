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
  const [loadedImages, setLoadedImages] = useState({
    // Immediately show the first image as loaded to prevent blocking
    [images[0].id]: true
  });

  // Lazy load images progressively to avoid blocking main thread
  useEffect(() => {
    const loadImageProgressively = (imageIndex) => {
      if (imageIndex >= images.length) return;
      
      const image = images[imageIndex];
      
      const img = new Image();
      img.onload = () => {
        // Update state for this image individually (non-blocking)
        setLoadedImages(prev => ({
          ...prev,
          [image.id]: true
        }));
        
        // Load next image after a delay to prevent blocking
        setTimeout(() => loadImageProgressively(imageIndex + 1), 200);
      };
      img.onerror = () => {
        // Mark as failed but continue loading others
        setLoadedImages(prev => ({
          ...prev,
          [image.id]: false
        }));
        
        setTimeout(() => loadImageProgressively(imageIndex + 1), 100);
      };
      img.src = image.src;
    };

    // Start loading from second image (first is already "loaded")
    const timeoutId = setTimeout(() => loadImageProgressively(1), 500);
    
    return () => clearTimeout(timeoutId);
  }, []);

  const generateImage = React.useCallback((image) => {
    const imageLoaded = loadedImages[image.id];
    
    return (
      <div className="carousel-image-container">
        {imageLoaded ? (
          <img 
            src={image.src}
            alt={image.title}
            className="carousel-image loaded"
          />
        ) : (
          <div className="carousel-image-placeholder"></div>
        )}
      </div>
    );
  }, [loadedImages]);

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
            onTouchStart={(e) => {
              // Prevent touch from interfering with scroll
              e.stopPropagation();
            }}
            onTouchEnd={(e) => {
              // Ensure touch selection works on mobile
              e.preventDefault();
              e.stopPropagation();
              setActiveImage(index);
            }}
            style={{ 
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent'
            }}
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
