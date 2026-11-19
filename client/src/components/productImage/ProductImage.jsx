import { useState } from 'react';
import { FaImage } from 'react-icons/fa';
import './productImage.css';

/** Product photo with a neutral placeholder if the image is missing or fails to load. */
const ProductImage = ({ src, alt, className = '' }) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={`product-image-fallback ${className}`} role="img" aria-label={alt}>
        <FaImage aria-hidden="true" />
      </div>
    );
  }
  return <img className={`product-image-img ${className}`} src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
};

export default ProductImage;
