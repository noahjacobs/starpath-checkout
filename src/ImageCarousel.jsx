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
  const [loadedImages, setLoadedImages] = useState({});

  // Preload all images
  useEffect(() => {
    const preloadImages = async () => {
      const imagePromises = images.map((image) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            setLoadedImages(prev => ({
              ...prev,
              [image.id]: true
            }));
            resolve(image.id);
          };
          img.onerror = () => {
            // Still resolve even on error to prevent blocking
            setLoadedImages(prev => ({
              ...prev,
              [image.id]: false
            }));
            resolve(image.id);
          };
          img.src = image.src;
        });
      });

      try {
        await Promise.all(imagePromises);
      } catch (error) {
        console.error('Error preloading images:', error);
      }
    };

    preloadImages();
  }, []);

  const generateImage = (image) => {
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
  };

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
