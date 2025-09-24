import React, { useState, useEffect } from 'react';

const ImageCarousel = () => {
  const [activeImage, setActiveImage] = useState(0);
  const [loadedImages, setLoadedImages] = useState({});

  const images = [
    {
      id: 1,
      title: 'Solar Array View',
      src: '/images/2.jpeg',
      fallbackGradient: 'linear-gradient(135deg, #1a2980 0%, #26d0ce 100%)',
      icon: '🌟'
    },
    {
      id: 2,
      title: 'Cell Detail',
      src: '/images/3.jpeg',
      fallbackGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      icon: '🔬'
    },
    {
      id: 3,
      title: 'Mars Installation',
      src: '/images/4.jpeg',
      fallbackGradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      icon: '🚀'
    },
    {
      id: 4,
      title: 'Technical Specs',
      src: '/images/5.jpeg',
      fallbackGradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      icon: '⚡'
    }
  ];

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
        {/* Skeleton/placeholder while loading */}
        <div 
          className={`carousel-image-skeleton ${imageLoaded ? 'loaded' : ''}`}
          style={{ 
            background: image.fallbackGradient,
          }}
        >
          <div className="carousel-image-overlay">
            <div className="carousel-image-icon">{image.icon}</div>
            <div className="carousel-image-title">{image.title}</div>
          </div>
        </div>
        
        {/* Actual image - render but keep hidden until loaded */}
        <img 
          src={image.src}
          alt={imageLoaded ? image.title : ""}
          className={`carousel-image ${imageLoaded ? 'loaded' : 'loading'}`}
          style={{
            opacity: imageLoaded ? 1 : 0,
            pointerEvents: imageLoaded ? 'auto' : 'none'
          }}
          onError={(e) => {
            // Hide image if it fails to load, keeping skeleton visible
            e.target.style.opacity = '0';
          }}
        />
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
